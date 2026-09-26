import { APP_CONFIG } from '../config'

export interface LonLatBbox {
  south: number
  west: number
  north: number
  east: number
}

const EARTH_M = 6_371_000

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)))
}

function metersToLat(meters: number) {
  return meters / 111_320
}

function metersToLon(meters: number, lat: number) {
  return meters / (111_320 * Math.max(0.2, Math.cos(lat * Math.PI / 180)))
}

export function coveringTiles(
  lat: number,
  lon: number,
  radiusM: number,
  tileM: number = APP_CONFIG.overpass.tileSizeM,
): LonLatBbox[] {
  const half = Math.max(0, Math.ceil(radiusM / tileM))
  const dLat = metersToLat(tileM)
  const dLon = metersToLon(tileM, lat)
  const tiles: LonLatBbox[] = []
  const reachM = radiusM + tileM * 0.71
  for (let row = -half; row <= half; row += 1) {
    for (let col = -half; col <= half; col += 1) {
      const centerLat = lat + row * dLat
      const centerLon = lon + col * dLon
      if (distanceMeters(lat, lon, centerLat, centerLon) > reachM) continue
      tiles.push({
        south: centerLat - dLat / 2,
        north: centerLat + dLat / 2,
        west: centerLon - dLon / 2,
        east: centerLon + dLon / 2,
      })
    }
  }
  return tiles.length > 0 ? tiles : [{
    south: lat - metersToLat(radiusM),
    north: lat + metersToLat(radiusM),
    west: lon - metersToLon(radiusM, lat),
    east: lon + metersToLon(radiusM, lat),
  }]
}

export function splitBbox(box: LonLatBbox): LonLatBbox[] {
  const midLat = (box.south + box.north) / 2
  const midLon = (box.west + box.east) / 2
  return [
    { south: box.south, west: box.west, north: midLat, east: midLon },
    { south: box.south, west: midLon, north: midLat, east: box.east },
    { south: midLat, west: box.west, north: box.north, east: midLon },
    { south: midLat, west: midLon, north: box.north, east: box.east },
  ]
}

export function bboxSpanMeters(box: LonLatBbox) {
  const midLat = (box.south + box.north) / 2
  const midLon = (box.west + box.east) / 2
  return Math.max(
    distanceMeters(box.south, midLon, box.north, midLon),
    distanceMeters(midLat, box.west, midLat, box.east),
  )
}

export function osmElementKey(element: unknown): string | null {
  if (!element || typeof element !== 'object') return null
  const record = element as { type?: unknown; id?: unknown }
  if (typeof record.type !== 'string' || typeof record.id !== 'number') return null
  return `${record.type}/${record.id}`
}

export function mergeOsmElements(parts: Array<{ elements?: unknown[] }>): { elements: unknown[] } {
  const seen = new Set<string>()
  const elements: unknown[] = []
  for (const part of parts) {
    for (const element of part.elements ?? []) {
      const key = osmElementKey(element)
      if (key) {
        if (seen.has(key)) continue
        seen.add(key)
      }
      elements.push(element)
    }
  }
  return { elements }
}

export function formatBboxFilter(box: LonLatBbox) {
  const round = (value: number) => value.toFixed(6)
  return `(${round(box.south)},${round(box.west)},${round(box.north)},${round(box.east)})`
}
