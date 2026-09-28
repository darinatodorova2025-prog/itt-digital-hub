'use client'

import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-draw'
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet'
import type { Locale } from '@/lib/i18n'
import { sa } from '../copy'
import { APP_CONFIG } from '../config'
import { tagsOf } from '../lib/classification'
import { clipCollectionToBoundary, sampleFeaturesForDisplay } from '../lib/geometry'
import type { AnalysisResult, PolygonFeature, SettlementResult } from '../types'
import type { TerrainSummary } from '../water/metrics'
import type { LayerVisibility } from './layer-visibility'
import type { FeatureCollection } from 'geojson'

export type { LayerVisibility } from './layer-visibility'

interface Props {
  locale: Locale
  selected: SettlementResult | null
  result: AnalysisResult | null
  visible: LayerVisibility
  editing: boolean
  cadastre: FeatureCollection | null
  terrain: TerrainSummary | null
  terrainStyleMode: 'elevation' | 'slope'
  onBoundaryEdited: (boundary: PolygonFeature) => void
}

function FitMap({ locale, selected, result }: { locale: Locale; selected: SettlementResult | null; result: AnalysisResult | null }) {
  const map = useMap()
  const previousKey = useRef('')
  const copy = sa(locale)
  useEffect(() => {
    L.drawLocal.edit.handlers.edit.tooltip.text = copy.editTooltip
    L.drawLocal.edit.handlers.edit.tooltip.subtext = copy.editSubtext
    const key = result ? `result:${result.createdAt}` : selected ? `selected:${selected.placeId}` : 'default'
    if (key !== previousKey.current) {
      previousKey.current = key
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (result) {
        const layer = L.geoJSON(result.boundary)
        map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 16, animate: !reducedMotion })
      } else if (selected) {
        if (reducedMotion) map.setView([selected.lat, selected.lon], 14)
        else map.flyTo([selected.lat, selected.lon], 14, { duration: 0.8 })
      } else {
        map.setView([42.72, 25.48], 7)
      }
    }
    const frame = window.requestAnimationFrame(() => map.invalidateSize())
    const later = window.setTimeout(() => map.invalidateSize(), 280)
    const onResize = () => map.invalidateSize()
    window.addEventListener('resize', onResize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
      window.removeEventListener('resize', onResize)
    }
  }, [copy.editSubtext, copy.editTooltip, map, result, selected])
  return null
}

function BoundaryEditor({ boundary, onChange }: { boundary: PolygonFeature; onChange: (boundary: PolygonFeature) => void }) {
  const map = useMap()
  useEffect(() => {
    const group = new L.FeatureGroup()
    L.geoJSON(boundary).eachLayer((layer) => group.addLayer(layer))
    group.addTo(map)
    const editor = new L.EditToolbar.Edit(map as unknown as L.DrawMap, { featureGroup: group })
    editor.enable()
    const publishBoundary = () => {
      const edited = group.toGeoJSON() as GeoJSON.FeatureCollection
      const feature = edited.features[0]
      if (feature && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')) onChange(feature as PolygonFeature)
    }
    map.on(L.Draw.Event.EDITVERTEX, publishBoundary)
    map.on(L.Draw.Event.EDITMOVE, publishBoundary)
    map.on(L.Draw.Event.EDITRESIZE, publishBoundary)
    map.on(L.Draw.Event.EDITED, publishBoundary)
    return () => {
      editor.disable()
      map.off(L.Draw.Event.EDITVERTEX, publishBoundary)
      map.off(L.Draw.Event.EDITMOVE, publishBoundary)
      map.off(L.Draw.Event.EDITRESIZE, publishBoundary)
      map.off(L.Draw.Event.EDITED, publishBoundary)
      group.removeFrom(map)
    }
  }, [boundary, map, onChange])
  return null
}

function poiLabel(tags: Record<string, string>, labels: Record<string, string>) {
  if (tags.name) return tags.name
  return labels[tags.amenity ?? ''] || (tags.sport ? labels.sport : labels.other)
}

export function MapView({ locale, selected, result, visible, editing, cadastre, terrain, terrainStyleMode, onBoundaryEdited }: Props) {
  const copy = sa(locale)
  const layers = useMemo(() => result?.categories.filter((category) => visible[category.key]) ?? [], [result, visible])
  const buildingLayer = useMemo(() => {
    if (!result || !visible.buildings) return null
    const max = APP_CONFIG.analysis.maxMapBuildings
    if (result.buildings.features.length <= max) return result.buildings
    return {
      ...result.buildings,
      features: sampleFeaturesForDisplay(result.buildings.features, max, (feature) => {
        const coords = feature.geometry.type === 'Polygon'
          ? feature.geometry.coordinates[0]?.[0]
          : feature.geometry.coordinates[0]?.[0]?.[0]
        return Array.isArray(coords) && coords.length >= 2 ? [coords[0], coords[1]] as [number, number] : null
      }),
    }
  }, [result, visible.buildings])
  const cadastreLayer = useMemo(() => {
    if (!result || !visible.cadastre || !cadastre) return null
    return clipCollectionToBoundary(cadastre, result.boundary)
  }, [cadastre, result, visible.cadastre])
  const mapKey = result?.createdAt ?? (selected ? `sel-${selected.placeId}` : 'bg')
  return (
    <>
      <MapContainer key={mapKey} className="map" center={[42.72, 25.48]} zoom={7} zoomControl={false} preferCanvas>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      <ZoomControl position="topright" zoomInTitle={copy.zoomIn} zoomOutTitle={copy.zoomOut} />
      <FitMap locale={locale} selected={selected} result={result} />
      {terrain && visible.terrain && terrain.cells.length > 0 && (
        <GeoJSON
          key={`terrain-${result?.createdAt}-${terrainStyleMode}`}
          data={{ type: 'FeatureCollection', features: terrain.cells } as FeatureCollection}
          style={(feature) => {
            const props = feature?.properties as { zone?: string; slopePercent?: number | null } | undefined
            const slope = props?.slopePercent ?? 0
            const color = terrainStyleMode === 'slope'
              ? (slope < 2 ? '#d7e4ea' : slope < 6 ? '#7aa0b8' : '#8d4a4a')
              : props?.zone === 'high' ? '#d07a45' : props?.zone === 'low' ? '#d5e0c4' : '#e6c36a'
            return { color, fillColor: color, fillOpacity: 0.45, weight: 0.4 }
          }}
        />
      )}
      {layers.map((category) => category.geometry && (
        <GeoJSON
          key={`${result?.createdAt}-${category.key}`}
          data={category.geometry}
          style={{ color: category.color, fillColor: category.color, fillOpacity: category.key === 'roads' ? 0.82 : 0.62, weight: category.key === 'roads' ? 1 : 0.7 }}
        />
      ))}
      {buildingLayer && (
        <GeoJSON key={`buildings-${result?.createdAt}`} data={buildingLayer} style={{ color: '#545b57', fillColor: '#f3f1e8', fillOpacity: 0.86, weight: 0.55 }} />
      )}
      {result && visible.boundary && !editing && (
        <GeoJSON key={`boundary-${result.createdAt}`} data={result.boundary} style={{ color: '#040e31', fillOpacity: 0, weight: 3 }} />
      )}
      {cadastreLayer && cadastreLayer.features.length > 0 && (
        <GeoJSON key={`cadastre-${result?.createdAt}`} data={cadastreLayer} style={{ color: '#b3261e', weight: 1, dashArray: '4 3', fillOpacity: 0 }} />
      )}
      {result && visible.pois && result.pois.features.map((feature, index) => {
        const [lon, lat] = feature.geometry.coordinates
        if (typeof lat !== 'number' || typeof lon !== 'number') return null
        const tags = tagsOf(feature)
        return (
          <CircleMarker key={`poi-${index}`} center={[lat, lon]} radius={6} pathOptions={{ color: '#fff', weight: 2, fillColor: '#002cff', fillOpacity: 1 }}>
            <Popup><strong>{poiLabel(tags, copy.poiLabels)}</strong>{tags['addr:street'] ? <><br />{tags['addr:street']}</> : null}</Popup>
          </CircleMarker>
        )
      })}
      {!result && selected && (
        <CircleMarker center={[selected.lat, selected.lon]} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#002cff', fillOpacity: 1 }}>
          <Popup>{selected.name}</Popup>
        </CircleMarker>
      )}
      {result && editing && <BoundaryEditor boundary={result.boundary} onChange={onBoundaryEdited} />}
      </MapContainer>
      <div className="map-notes">
        {buildingLayer && result && result.buildings.features.length > buildingLayer.features.length ? (
          <p className="map-note">{copy.mapBuildingsSampled.replace('{shown}', String(buildingLayer.features.length)).replace('{total}', String(result.buildings.features.length))}</p>
        ) : null}
        <p className="map-note">{copy.mapDisclaimer}</p>
      </div>
    </>
  )
}
