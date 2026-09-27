import { elevationGrid, type ElevationSample } from './metrics'

const USER_AGENT = 'ITT-Digital-Hub-Settlement-Analyzer/1.0 (https://ittdigitalhub.org; terrain)'

export interface ElevationRead {
  sourceName: string
  resolutionM: number
  samples: ElevationSample[]
}

async function readEuDem25(grid: Array<{ lat: number; lon: number; dLat: number; dLon: number }>): Promise<ElevationRead | null> {
  const url = new URL('https://api.opentopodata.org/v1/eudem25m')
  url.searchParams.set('locations', grid.map((cell) => `${cell.lat.toFixed(5)},${cell.lon.toFixed(5)}`).join('|'))
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) return null
  const payload = await response.json() as { status?: string; results?: Array<{ elevation?: number | null }> }
  if (payload.status !== 'OK' || !Array.isArray(payload.results) || payload.results.length !== grid.length) return null
  const samples = grid.flatMap((cell, index) => {
    const elevationM = payload.results?.[index]?.elevation
    if (elevationM == null || !Number.isFinite(elevationM)) return []
    return [{ lat: cell.lat, lon: cell.lon, elevationM, dLat: cell.dLat, dLon: cell.dLon }]
  })
  if (samples.length < grid.length * 0.8) return null
  return { sourceName: 'EU-DEM 25 m', resolutionM: 25, samples }
}

async function readCopernicus90(grid: Array<{ lat: number; lon: number; dLat: number; dLon: number }>): Promise<ElevationRead | null> {
  const url = new URL('https://api.open-meteo.com/v1/elevation')
  url.searchParams.set('latitude', grid.map((cell) => cell.lat.toFixed(5)).join(','))
  url.searchParams.set('longitude', grid.map((cell) => cell.lon.toFixed(5)).join(','))
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) return null
  const payload = await response.json() as { elevation?: number[] }
  if (!Array.isArray(payload.elevation) || payload.elevation.length !== grid.length) return null
  const samples = grid.flatMap((cell, index) => {
    const elevationM = payload.elevation?.[index]
    if (elevationM == null || !Number.isFinite(elevationM)) return []
    return [{ lat: cell.lat, lon: cell.lon, elevationM, dLat: cell.dLat, dLon: cell.dLon }]
  })
  if (samples.length < 4) return null
  return { sourceName: 'Copernicus DEM GLO-90', resolutionM: 90, samples }
}

export async function readElevationGrid(west: number, south: number, east: number, north: number): Promise<ElevationRead | null> {
  const grid = elevationGrid(west, south, east, north, 64)
  return await readEuDem25(grid) ?? await readCopernicus90(grid)
}
