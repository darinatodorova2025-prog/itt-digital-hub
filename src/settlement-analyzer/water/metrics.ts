import { booleanPointInPolygon, point } from '@turf/turf'
import type { Feature, Polygon } from 'geojson'
import type { PolygonFeature } from '../types'

export interface ElevationSample {
  lat: number
  lon: number
  elevationM: number
  dLat?: number
  dLon?: number
}

export type TerrainZoneKey = 'low' | 'mid' | 'high'

export interface TerrainZone {
  key: TerrainZoneKey
  minM: number
  maxM: number
  sharePercent: number
}

export interface TerrainCell {
  type: 'Feature'
  geometry: Polygon
  properties: { elevationM: number; slopePercent: number | null; zone: TerrainZoneKey }
}

export interface TerrainSummary {
  status: 'active' | 'unavailable'
  sourceName: string
  resolutionM: number
  fetchedAt: string | null
  minM: number | null
  maxM: number | null
  differenceM: number | null
  typicalSlopePercent: number | null
  maxSlopePercent: number | null
  downhillBearingDeg: number | null
  zones: TerrainZone[]
  sampleCount: number
  cells: TerrainCell[]
}

export const TERRAIN_SOURCE = { sourceName: 'EU-DEM 25 m', resolutionM: 25 } as const

export function elevationGrid(west: number, south: number, east: number, north: number, maxPoints = 64) {
  const latSpan = Math.max(north - south, 0.001)
  const lonSpan = Math.max(east - west, 0.001)
  const aspect = lonSpan / latSpan
  let rows = Math.max(2, Math.round(Math.sqrt(maxPoints / Math.max(aspect, 0.2))))
  let cols = Math.max(2, Math.round(rows * aspect))
  while (rows * cols > maxPoints) {
    if (cols > rows) cols -= 1
    else rows -= 1
  }
  const dLat = latSpan / rows
  const dLon = lonSpan / cols
  const points: Array<{ lat: number; lon: number; dLat: number; dLon: number }> = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      points.push({ lat: south + (row + 0.5) * dLat, lon: west + (col + 0.5) * dLon, dLat, dLon })
    }
  }
  return points
}

function metersBetween(a: ElevationSample, b: ElevationSample) {
  const dLat = (b.lat - a.lat) * 111_320
  const dLon = (b.lon - a.lon) * 111_320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function bearingDeg(east: number, north: number) {
  return ((Math.atan2(east, north) * 180) / Math.PI + 360) % 360
}

function zoneFor(elevation: number, zones: TerrainZone[]): TerrainZoneKey {
  return zones.find((zone) => elevation >= zone.minM && elevation <= zone.maxM)?.key ?? 'mid'
}

function cellRing(lat: number, lon: number, dLat: number, dLon: number): Polygon {
  const halfLat = dLat / 2
  const halfLon = dLon / 2
  return {
    type: 'Polygon',
    coordinates: [[
      [lon - halfLon, lat - halfLat],
      [lon + halfLon, lat - halfLat],
      [lon + halfLon, lat + halfLat],
      [lon - halfLon, lat + halfLat],
      [lon - halfLon, lat - halfLat],
    ]],
  }
}

export function samplesInsideBoundary(samples: ElevationSample[], boundary: PolygonFeature) {
  return samples.filter((sample) => {
    try { return booleanPointInPolygon(point([sample.lon, sample.lat]), boundary) } catch { return false }
  })
}

export function summarizeTerrain(samples: ElevationSample[], fetchedAt: string | null): TerrainSummary {
  const empty: TerrainSummary = {
    status: 'unavailable', sourceName: TERRAIN_SOURCE.sourceName, resolutionM: TERRAIN_SOURCE.resolutionM, fetchedAt,
    minM: null, maxM: null, differenceM: null, typicalSlopePercent: null, maxSlopePercent: null, downhillBearingDeg: null,
    zones: [], sampleCount: samples.length, cells: [],
  }
  if (samples.length < 4) return empty
  const elevations = samples.map((sample) => sample.elevationM)
  const minM = Math.min(...elevations)
  const maxM = Math.max(...elevations)
  const sorted = [...elevations].sort((left, right) => left - right)
  const third = Math.max(1, Math.floor(sorted.length / 3))
  const lowCut = sorted[third - 1] ?? minM
  const highCut = sorted[sorted.length - third] ?? maxM
  const counts = { low: 0, mid: 0, high: 0 }
  for (const elevation of elevations) {
    if (elevation <= lowCut) counts.low += 1
    else if (elevation >= highCut) counts.high += 1
    else counts.mid += 1
  }
  const share = (count: number) => Math.round((count / samples.length) * 100)
  const zones: TerrainZone[] = [
    { key: 'low', minM, maxM: lowCut, sharePercent: share(counts.low) },
    { key: 'mid', minM: lowCut, maxM: highCut, sharePercent: share(counts.mid) },
    { key: 'high', minM: highCut, maxM, sharePercent: share(counts.high) },
  ]
  const slopes: number[] = []
  const slopeByKey = new Map<string, number>()
  let east = 0
  let north = 0
  for (const sample of samples) {
    let nearest: ElevationSample | null = null
    let nearestM = Number.POSITIVE_INFINITY
    for (const other of samples) {
      if (other === sample) continue
      const distance = metersBetween(sample, other)
      if (distance > 20 && distance < nearestM) {
        nearest = other
        nearestM = distance
      }
    }
    if (!nearest || nearestM > 2500) continue
    const slope = (Math.abs(nearest.elevationM - sample.elevationM) / nearestM) * 100
    slopes.push(slope)
    slopeByKey.set(`${sample.lat.toFixed(5)}:${sample.lon.toFixed(5)}`, slope)
    if (sample.elevationM > nearest.elevationM) {
      east += (nearest.lon - sample.lon) * (sample.elevationM - nearest.elevationM)
      north += (nearest.lat - sample.lat) * (sample.elevationM - nearest.elevationM)
    }
  }
  return {
    status: 'active',
    sourceName: TERRAIN_SOURCE.sourceName,
    resolutionM: TERRAIN_SOURCE.resolutionM,
    fetchedAt,
    minM: Math.round(minM),
    maxM: Math.round(maxM),
    differenceM: Math.round(maxM - minM),
    typicalSlopePercent: median(slopes) == null ? null : Math.round(median(slopes)! * 10) / 10,
    maxSlopePercent: slopes.length ? Math.round(Math.max(...slopes) * 10) / 10 : null,
    downhillBearingDeg: east === 0 && north === 0 ? null : Math.round(bearingDeg(east, north)),
    zones,
    sampleCount: samples.length,
    cells: samples.flatMap((sample) => {
      if (!sample.dLat || !sample.dLon) return []
      return [{
        type: 'Feature' as const,
        geometry: cellRing(sample.lat, sample.lon, sample.dLat, sample.dLon),
        properties: {
          elevationM: Math.round(sample.elevationM),
          slopePercent: slopeByKey.get(`${sample.lat.toFixed(5)}:${sample.lon.toFixed(5)}`) ?? null,
          zone: zoneFor(sample.elevationM, zones),
        },
      }]
    }),
  }
}

export function componentCount(feature: Feature<Polygon | GeoJSON.MultiPolygon> | null | undefined) {
  const geometry = feature?.geometry
  if (!geometry) return 0
  if (geometry.type === 'Polygon') return 1
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.length
  return 0
}
