'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import { CircleHelp, Download, Play, RotateCcw, TriangleAlert } from 'lucide-react'
import type { FeatureCollection } from 'geojson'
import type { Locale } from '@/lib/i18n'
import { BetaBadge } from '@/components/ui/BetaBadge'
import { ProductHeader } from './ProductHeader'
import { sa } from './copy'
import { APP_CONFIG } from './config'
import { LayerPanel } from './components/LayerPanel'
import { type LayerVisibility } from './components/layer-visibility'
import type { AnalysisResult, AnalysisStage, PackCatalogItem, PackDownloadProgress, PolygonFeature, RawGeodata, SettlementResult } from './types'
import { PackMenu } from './components/PackMenu'
import { ResultsPanel } from './components/ResultsPanel'
import { SearchPanel } from './components/SearchPanel'
import { analysisToCsv, analysisToGeoJson, downloadText, safeFilename } from './lib/export'
import { dataRadiusForBoundary } from './lib/geometry'
import { bbox } from '@turf/turf'
import { analysisRadiusForSettlement, analyzeSettlement } from './services/analysis'
import { trackEvent } from './conference/tracking'
import { NetworkInterestModal } from './water/NetworkInterestModal'
import { samplesInsideBoundary, summarizeTerrain, type ElevationSample, type TerrainSummary } from './water/metrics'
import { layersForMode, terrainStyle, WATER_CONTEXTS, type WaterContext } from './water/modes'
import { waterText } from './water/copy'
import { fetchUrbanizedParcels } from './services/cadastre'
import { fetchSettlementGeodata, GeodataTooLargeError, GeodataUnavailableError } from './services/overpass'
import { catalogHas, loadPackCatalog, loadShippedPackCatalog } from './services/pack-catalog'
import { downloadAndStorePack } from './services/packs'
import { attachOpenPolygon, searchSettlements, SettlementSearchError, settlementByEkatte } from './services/search'

type MapViewProps = {
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

function ClientMap(props: MapViewProps) {
  const [MapView, setMapView] = useState<ComponentType<MapViewProps> | null>(null)

  useEffect(() => {
    let active = true
    void import('./components/MapView').then((mod) => {
      if (active) setMapView(() => mod.MapView)
    })
    return () => {
      active = false
    }
  }, [])

  if (!MapView) return <div className="map" aria-hidden />
  return <MapView {...props} />
}

interface AppProps {
  locale: Locale
  ownerMode?: boolean
  analysisCount?: number
  onAnalysisStarted?: (isSecond: boolean) => void
  onAnalysisCompleted?: (result: AnalysisResult) => void
  onFeatureUsed?: (featureName: string) => void
}

function App({ locale, ownerMode = false, analysisCount = 0, onAnalysisStarted, onAnalysisCompleted, onFeatureUsed }: AppProps) {
  const copy = sa(locale)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SettlementResult[]>([])
  const [selected, setSelected] = useState<SettlementResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [rawData, setRawData] = useState<RawGeodata | null>(null)
  const [rawDataRadiusM, setRawDataRadiusM] = useState(0)
  const [stage, setStage] = useState<AnalysisStage>('idle')
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [visible, setVisible] = useState<LayerVisibility>(() => layersForMode('supply'))
  const [layersCollapsed, setLayersCollapsed] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editedBoundary, setEditedBoundary] = useState<PolygonFeature | null>(null)
  const [cadastreParcels, setCadastreParcels] = useState<FeatureCollection | null>(null)
  const [packCatalog, setPackCatalog] = useState<PackCatalogItem[]>([])
  const [downloadProgress, setDownloadProgress] = useState<PackDownloadProgress | null>(null)
  const [lastFailure, setLastFailure] = useState<'analysis' | 'pack' | null>(null)
  const [mode, setMode] = useState<WaterContext>('supply')
  const [terrain, setTerrain] = useState<TerrainSummary | null>(null)
  const [terrainState, setTerrainState] = useState<'idle' | 'loading' | 'active' | 'unavailable'>('idle')
  const [networkOpen, setNetworkOpen] = useState(false)
  const analysisAbort = useRef<AbortController | null>(null)
  const downloadAbort = useRef<AbortController | null>(null)
  const polygonRequest = useRef<{ key: string; promise: Promise<GeoJSON.Geometry | undefined> } | null>(null)
  const infoButtonRef = useRef<HTMLButtonElement | null>(null)
  const infoCloseRef = useRef<HTMLButtonElement | null>(null)

  const requestOpenPolygon = (settlement: SettlementResult) => {
    const key = settlement.ekatte ?? `${settlement.osmType}:${settlement.osmId}`
    if (polygonRequest.current?.key === key) return polygonRequest.current.promise
    const promise = attachOpenPolygon(settlement)
    polygonRequest.current = { key, promise }
    return promise
  }

  const refreshPackCatalog = useCallback(() => {
    void loadShippedPackCatalog().then((shipped) => {
      setPackCatalog((current) => (current.length === 0 ? shipped : current))
    })
    void loadPackCatalog().then(setPackCatalog)
  }, [])

  useEffect(() => {
    refreshPackCatalog()
  }, [refreshPackCatalog])

  useEffect(() => {
    if (!result) {
      setTerrain(null)
      setTerrainState('idle')
      return
    }
    const embedded = rawData?.terrainSamples
    if (embedded && embedded.length >= 4) {
      const inside = samplesInsideBoundary(embedded, result.boundary)
      const summary = summarizeTerrain(inside, rawData?.fetchedAt ?? null)
      if (inside.length >= 4) {
        if (rawData?.terrainSourceName) summary.sourceName = rawData.terrainSourceName
        if (rawData?.terrainResolutionM) summary.resolutionM = rawData.terrainResolutionM
        setTerrain(summary)
        setTerrainState(summary.status)
        return
      }
    }
    const [west, south, east, north] = bbox(result.boundary)
    const controller = new AbortController()
    setTerrainState('loading')
    void fetch('/api/settlement-analyzer/terrain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ west, south, east, north }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('terrain')
      const payload = await response.json() as { fetchedAt?: string; sourceName?: string; resolutionM?: number; samples?: ElevationSample[] }
      const inside = samplesInsideBoundary(payload.samples ?? [], result.boundary)
      const summary = summarizeTerrain(inside, payload.fetchedAt ?? null)
      if (payload.sourceName) summary.sourceName = payload.sourceName
      if (payload.resolutionM) summary.resolutionM = payload.resolutionM
      setTerrain(summary)
      setTerrainState(summary.status)
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setTerrain(null)
      setTerrainState('unavailable')
    })
    return () => controller.abort()
  }, [rawData, result])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 820px)')
    const syncCollapsed = () => setLayersCollapsed(media.matches)
    syncCollapsed()
    media.addEventListener('change', syncCollapsed)
    window.addEventListener('resize', syncCollapsed)
    return () => {
      media.removeEventListener('change', syncCollapsed)
      window.removeEventListener('resize', syncCollapsed)
    }
  }, [])

  useEffect(() => {
    if (!infoOpen) return
    infoCloseRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInfoOpen(false)
        infoButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [infoOpen])

  useEffect(() => {
    if (selected || query.trim().length < APP_CONFIG.search.minQueryLength) {
      setSearchResults([])
      setSearchError(null)
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearchLoading(true)
      setSearchError(null)
      try {
        setSearchResults(await searchSettlements(query, controller.signal, locale))
      } catch (error) {
        if (controller.signal.aborted) return
        if (error instanceof SettlementSearchError) {
          setSearchError(error.code === 'rate_limited' ? copy.searchBusy : copy.searchUnavailable)
        } else {
          setSearchError(copy.searchFailed)
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }, APP_CONFIG.search.debounceMs)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [copy.searchBusy, copy.searchFailed, copy.searchUnavailable, locale, query, selected])

  const handleQueryChange = (value: string) => {
    setSelected(null)
    setResult(null)
    setRawData(null)
    setRawDataRadiusM(0)
    setEditing(false)
    setEditedBoundary(null)
    setCadastreParcels(null)
    setAnalysisError(null)
    setLastFailure(null)
    setStage('idle')
    setQuery(value)
  }

  const handleSelect = (settlement: SettlementResult) => {
    setSelected(settlement)
    setQuery(settlement.name)
    setSearchResults([])
    setSearchError(null)
    void requestOpenPolygon(settlement).then((geojson) => {
      if (!geojson) return
      setSelected((prev) => (prev && prev.ekatte === settlement.ekatte ? { ...prev, geojson } : prev))
    })
  }

  const handleSelectPack = (item: PackCatalogItem) => {
    const settlement = settlementByEkatte(item.ekatte)
    if (settlement) handleSelect(settlement)
  }

  const runPackDownload = async () => {
    if (!selected?.ekatte || downloadProgress) return
    downloadAbort.current?.abort()
    const controller = new AbortController()
    downloadAbort.current = controller
    setAnalysisError(null)
    setDownloadProgress({ percent: 1, part: 'landuse', attempt: 1, status: 'start' })
    try {
      await downloadAndStorePack(selected, (progress) => {
        if (downloadAbort.current !== controller) return
        setDownloadProgress(progress)
      }, controller.signal)
      if (downloadAbort.current !== controller) return
      refreshPackCatalog()
      setDownloadProgress(null)
      setLastFailure(null)
    } catch (error) {
      if (downloadAbort.current !== controller) return
      setDownloadProgress(null)
      setLastFailure('pack')
      if (controller.signal.aborted) {
        setAnalysisError(copy.packDownloadCancelled)
        return
      }
      if (error instanceof GeodataTooLargeError) {
        setAnalysisError(copy.settlementTooLarge)
        return
      }
      setAnalysisError(copy.packDownloadFailed)
    }
  }

  const cancelPackDownload = () => {
    downloadAbort.current?.abort()
    downloadAbort.current = null
    setDownloadProgress(null)
  }

  const runAnalysis = async () => {
    if (!selected) return
    onAnalysisStarted?.(analysisCount >= 1)
    analysisAbort.current?.abort()
    const controller = new AbortController()
    analysisAbort.current = controller
    const timeout = window.setTimeout(() => controller.abort(), APP_CONFIG.overpass.overallTimeoutMs)
    setAnalysisError(null)
    setLastFailure(null)
    setResult(null)
    setCadastreParcels(null)
    setStage('boundary')
    try {
      setStage('boundary')
      const geojson = await requestOpenPolygon(selected)
      const settlementForAnalysis = geojson ? { ...selected, geojson } : selected
      if (geojson) setSelected(settlementForAnalysis)
      const analysisRadiusM = analysisRadiusForSettlement(settlementForAnalysis)
      const raw = await fetchSettlementGeodata(
        settlementForAnalysis.lat,
        settlementForAnalysis.lon,
        controller.signal,
        analysisRadiusM,
        (part) => {
          if (analysisAbort.current !== controller) return
          setStage(part === 'pois' ? 'landuse' : part)
        },
        settlementForAnalysis.ekatte,
      )
      let currentRaw = raw
      let currentRadius: number = analysisRadiusM
      let analysis = analyzeSettlement(settlementForAnalysis, currentRaw)
      if (analysis.warnings.includes('dataExtentReached') && currentRadius < APP_CONFIG.overpass.cityRadiusM) {
        const widerRadius = Math.min(APP_CONFIG.overpass.cityRadiusM, Math.round(currentRadius * 1.8 / 100) * 100)
        if (widerRadius > currentRadius) {
          setStage('buildings')
          currentRaw = await fetchSettlementGeodata(
            settlementForAnalysis.lat,
            settlementForAnalysis.lon,
            controller.signal,
            widerRadius,
            undefined,
            settlementForAnalysis.ekatte,
          )
          currentRadius = widerRadius
          analysis = analyzeSettlement(settlementForAnalysis, currentRaw)
        }
      }
      if (analysisAbort.current !== controller) return
      setRawData(currentRaw)
      setRawDataRadiusM(currentRadius)
      setStage('metrics')
      setResult(analysis)
      onAnalysisCompleted?.(analysis)
      if (selected.ekatte) {
        void fetchUrbanizedParcels(selected.ekatte, controller.signal).then((parcels) => {
          if (analysisAbort.current !== controller) return
          setCadastreParcels(parcels)
        })
      }
      setStage('map')
      await new Promise((resolve) => window.setTimeout(resolve, 80))
      if (analysisAbort.current !== controller) return
      setStage('complete')
    } catch (error) {
      if (analysisAbort.current !== controller) return
      if (error instanceof GeodataTooLargeError) {
        setAnalysisError(copy.settlementTooLarge)
        setStage('idle')
        setLastFailure('analysis')
        return
      }
      const aborted = controller.signal.aborted
      const detail = aborted || error instanceof GeodataUnavailableError
        ? (ownerMode && error instanceof GeodataUnavailableError ? `${copy.geodataUnavailable} ${error.sources}` : copy.geodataUnavailable)
        : copy.analysisUnexpected
      setAnalysisError(detail)
      setStage('idle')
      setLastFailure('analysis')
    } finally {
      window.clearTimeout(timeout)
    }
  }

  const newAnalysis = () => {
    analysisAbort.current?.abort()
    analysisAbort.current = null
    downloadAbort.current?.abort()
    downloadAbort.current = null
    setQuery('')
    setSearchResults([])
    setSelected(null)
    setResult(null)
    setRawData(null)
    setRawDataRadiusM(0)
    setStage('idle')
    setAnalysisError(null)
    setEditing(false)
    setEditedBoundary(null)
    setCadastreParcels(null)
    setVisible(layersForMode(mode))
    polygonRequest.current = null
    setDownloadProgress(null)
  }

  const startEditing = () => {
    if (!result) return
    onFeatureUsed?.('edit_boundary')
    setEditedBoundary(result.boundary)
    setEditing(true)
  }
  const cancelEditing = () => { setEditing(false); setEditedBoundary(null) }
  const recalculate = async () => {
    if (!selected || !rawData || !editedBoundary) return
    const boundary = editedBoundary
    const requiredRadiusM = dataRadiusForBoundary(boundary, selected.lat, selected.lon)
    if (requiredRadiusM > APP_CONFIG.overpass.maximumEditedRadiusM) {
      setAnalysisError(copy.editedTooLarge)
      return
    }
    setAnalysisError(null)
    setEditing(false)
    try {
      let currentRaw = rawData
      if (requiredRadiusM > rawDataRadiusM) {
        setStage('buildings')
        currentRaw = await fetchSettlementGeodata(selected.lat, selected.lon, undefined, requiredRadiusM, undefined, selected.ekatte)
        setRawData(currentRaw)
        setRawDataRadiusM(requiredRadiusM)
      }
      setStage('geometry')
      await new Promise((resolve) => window.setTimeout(resolve, 40))
      setResult(analyzeSettlement(selected, currentRaw, boundary))
      setEditedBoundary(null)
      setStage('complete')
    } catch {
      setEditing(true)
      setStage('complete')
      setAnalysisError(copy.editedFailed)
    }
  }

  const exportCsv = () => {
    if (!result) return
    onFeatureUsed?.('export_csv')
    const suffix = locale === 'en' ? 'analysis' : 'анализ'
    downloadText(analysisToCsv(result, locale), `${safeFilename(result.settlement.name)}-${suffix}.csv`, 'text/csv;charset=utf-8')
  }
  const exportGeoJson = () => {
    if (!result) return
    onFeatureUsed?.('export_geojson')
    const suffix = locale === 'en' ? 'analysis' : 'анализ'
    downloadText(JSON.stringify(analysisToGeoJson(result, locale), null, 2), `${safeFilename(result.settlement.name)}-${suffix}.geojson`, 'application/geo+json;charset=utf-8')
  }

  const handleBoundaryEdited = useCallback((boundary: PolygonFeature) => setEditedBoundary(boundary), [])
  const analyzing = !['idle', 'complete'].includes(stage)
  const downloading = Boolean(downloadProgress)
  const selectedHasPack = catalogHas(packCatalog, selected?.ekatte)
  const downloadLabel = downloadProgress
    ? `${downloadProgress.percent}% · ${copy.packProgress[downloadProgress.part]}${downloadProgress.status === 'retry' ? ` · ${copy.packProgress.retry} ${downloadProgress.attempt}` : ''}`
    : ''

  return (
    <div className="app-shell">
      <ProductHeader
        locale={locale}
        ownerMode={ownerMode}
        onNewAnalysis={result ? newAnalysis : undefined}
        infoSlot={(
          <>
            <button
              ref={infoButtonRef}
              type="button"
              className="info-button"
              aria-label={copy.aboutTitle}
              aria-expanded={infoOpen}
              aria-controls="sa-about-panel"
              onClick={() => setInfoOpen((value) => !value)}
            >
              <CircleHelp />
            </button>
            {infoOpen && (
              <aside id="sa-about-panel" className="info-popover" role="dialog" aria-labelledby="sa-about-title">
                <strong id="sa-about-title">{copy.aboutTitle}</strong>
                {copy.aboutBody.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                <button ref={infoCloseRef} type="button" className="button" onClick={() => { setInfoOpen(false); infoButtonRef.current?.focus() }}>{copy.close}</button>
              </aside>
            )}
          </>
        )}
      />

      <section className="command-bar" aria-label={copy.commandBar}>
        <header className="command-intro">
          <h1>
            {copy.name}
            <BetaBadge className="ml-2.5 align-middle" />
          </h1>
          <p>{copy.intro}</p>
        </header>
        <SearchPanel
          locale={locale}
          query={query}
          onQueryChange={handleQueryChange}
          results={searchResults}
          selected={selected}
          loading={searchLoading}
          error={searchError}
          onSelect={handleSelect}
        />
        <PackMenu
          locale={locale}
          catalog={packCatalog}
          selectedEkatte={selected?.ekatte}
          disabled={analyzing || downloading}
          onSelect={handleSelectPack}
        />
        <div className="command-actions">
          {selected && !selectedHasPack ? (
            <button type="button" className="button pack-download" disabled={analyzing || downloading || !selected.ekatte} onClick={runPackDownload}>
              <Download size={16} />
              {downloading ? copy.downloadingPack : copy.downloadPack}
            </button>
          ) : null}
          <button type="button" className="analyze-button" disabled={!selected || analyzing || downloading} onClick={runAnalysis} title={selectedHasPack ? copy.packReady : undefined}>
            {analyzing ? <span className="spinner spinner--light" /> : <Play size={18} fill="currentColor" />}
            {analyzing ? copy.analyzing : copy.analyze}
          </button>
        </div>
        {analysisError ? (
          <div className="command-status command-status--error" role="alert">
            <TriangleAlert aria-hidden="true" />
            <span>{analysisError}</span>
            <button type="button" className="retry-button" onClick={lastFailure === 'pack' ? runPackDownload : runAnalysis}><RotateCcw size={16} /> {copy.retry}</button>
          </div>
        ) : null}
        <div className="mode-bar" role="tablist" aria-label={waterText(locale).modesLabel}>
          {WATER_CONTEXTS.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={mode === item} className={mode === item ? 'mode-bar__item mode-bar__item--active' : 'mode-bar__item'} onClick={() => { setMode(item); setVisible(layersForMode(item)) }}>
              {waterText(locale).modes[item]}
            </button>
          ))}
        </div>
      </section>

      <main className={`workspace ${result ? 'workspace--with-results' : ''}`}>
        <section className="map-region" aria-label={copy.mapRegion}>
          <ClientMap locale={locale} selected={selected} result={result} visible={visible} editing={editing} cadastre={cadastreParcels} terrain={terrain} terrainStyleMode={terrainStyle(mode)} onBoundaryEdited={handleBoundaryEdited} />
          <LayerPanel locale={locale} terrainLabel={waterText(locale).terrainLayer} visible={visible} onChange={setVisible} collapsed={layersCollapsed} onToggleCollapsed={() => setLayersCollapsed((value) => !value)} />
          {analyzing && <div className="analysis-overlay" role="status" aria-live="polite"><span className="analysis-loader" /><strong>{copy.stages[stage] ?? ''}</strong></div>}
          {downloading && downloadProgress ? (
            <div className="analysis-overlay" role="status" aria-live="polite">
              <span className="analysis-loader" />
              <strong>{copy.downloadingPack}</strong>
              <p className="pack-progress-label">{downloadLabel}</p>
              <div className="pack-progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={downloadProgress.percent} role="progressbar">
                <span style={{ width: `${downloadProgress.percent}%` }} />
              </div>
              <button type="button" className="button" onClick={cancelPackDownload}>{copy.cancelDownload}</button>
            </div>
          ) : null}
        </section>

        {result ? (
          <ResultsPanel
            locale={locale}
            mode={mode}
            result={result}
            terrain={terrain}
            terrainState={terrainState}
            editing={editing}
            cadastreLoaded={Boolean(cadastreParcels && cadastreParcels.features.length > 0)}
            onOpenNetwork={() => { setNetworkOpen(true); void trackEvent('network_upload_modal_open') }}
            onStartEditing={startEditing}
            onCancelEditing={cancelEditing}
            onRecalculate={recalculate}
            onExportCsv={exportCsv}
            onExportGeoJson={exportGeoJson}
          />
        ) : null}
      </main>
      <NetworkInterestModal locale={locale} open={networkOpen} onClose={() => setNetworkOpen(false)} />
    </div>
  )
}

export default App
