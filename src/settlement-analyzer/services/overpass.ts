import osmtogeojson from 'osmtogeojson'
import { centroid, featureCollection } from '@turf/turf'
import { APP_CONFIG } from '../config'
import { tagsOf } from '../lib/classification'
import { coveringTiles, formatBboxFilter, mergeOsmElements, splitBbox, bboxSpanMeters, type LonLatBbox } from '../lib/overpass-tiles'
import { packDownloadProgress } from '../lib/pack-progress'
import type { PackDownloadProgress, RawGeodata, StoredSettlementPack } from '../types'
import type { Feature, Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson'
import { readLocalPack } from './pack-store'

interface CacheEntry<T> { value: T; createdAt: number }

const PART_TIMEOUT_SECONDS = APP_CONFIG.overpass.timeoutSeconds
const PRIMARY_TIMEOUT_MS = (PART_TIMEOUT_SECONDS + 8) * 1000
const MIRROR_TIMEOUT_MS = 12_000
const PRIMARY_BACKOFF_MS = [3000, 6000, 10_000]
export type OverpassPart = 'buildings' | 'roads' | 'landuse' | 'pois'
type OsmJson = { elements?: unknown[] }

function aroundFilter(lat: number, lon: number, radius: number) {
  return `(around:${radius},${lat},${lon})`
}

function partBody(spatial: string) {
  return {
    landuse: `(
        nwr["landuse"]${spatial};
        nwr["natural"~"^(water|wood|scrub|grassland|wetland)$"]${spatial};
        nwr["leisure"~"^(park|recreation_ground|garden|nature_reserve)$"]${spatial};
        nwr["waterway"~"^(riverbank|dock|canal)$"]${spatial};
      );out geom qt;`,
    buildings: `(way["building"]${spatial};);out geom qt;`,
    roads: `(way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)$"]${spatial};);out geom qt;`,
    pois: `(
        nwr["amenity"~"^(school|kindergarten|townhall|clinic|doctors|hospital|pharmacy|place_of_worship|community_centre|library|sports_centre|parking|grave_yard)$"]${spatial};
        nwr["sport"]${spatial};
      );out geom qt;`,
  } as const
}

function wrapQuery(body: string, timeoutSeconds: number) {
  return `[out:json][timeout:${timeoutSeconds}][maxsize:33554432];${body}`
}

function buildPartQueries(lat: number, lon: number, radius: number, timeoutSeconds: number = PART_TIMEOUT_SECONDS) {
  const around = aroundFilter(lat, lon, radius)
  const bodies = partBody(around)
  return [
    {
      part: 'landuse' as const,
      required: true,
      query: wrapQuery(bodies.landuse, timeoutSeconds),
      bboxQuery: (box: LonLatBbox) => wrapQuery(partBody(formatBboxFilter(box)).landuse, timeoutSeconds),
    },
    {
      part: 'buildings' as const,
      required: true,
      query: wrapQuery(bodies.buildings, timeoutSeconds),
      bboxQuery: (box: LonLatBbox) => wrapQuery(partBody(formatBboxFilter(box)).buildings, timeoutSeconds),
    },
    {
      part: 'roads' as const,
      required: true,
      query: wrapQuery(bodies.roads, timeoutSeconds),
      bboxQuery: (box: LonLatBbox) => wrapQuery(partBody(formatBboxFilter(box)).roads, timeoutSeconds),
    },
    {
      part: 'pois' as const,
      required: false,
      query: wrapQuery(bodies.pois, timeoutSeconds),
      bboxQuery: (box: LonLatBbox) => wrapQuery(partBody(formatBboxFilter(box)).pois, timeoutSeconds),
    },
  ]
}

function readCache(key: string): RawGeodata | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<RawGeodata>
    if (Date.now() - entry.createdAt > APP_CONFIG.overpass.cacheTtlMs) return null
    return entry.value
  } catch {
    return null
  }
}

function writeCache(key: string, value: RawGeodata) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, createdAt: Date.now() }))
  } catch {
    // Large responses can exceed browser storage; analysis still works without cache.
  }
}

function signalForEndpoint(parent: AbortSignal | undefined, timeoutMs: number) {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (!parent) return timeout
  if (typeof AbortSignal.any === 'function') return AbortSignal.any([parent, timeout])
  const controller = new AbortController()
  const abort = () => controller.abort()
  parent.addEventListener('abort', abort)
  timeout.addEventListener('abort', abort)
  if (parent.aborted || timeout.aborted) controller.abort()
  return controller.signal
}

async function wait(ms: number, signal?: AbortSignal) {
  if (ms <= 0) return
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timeout)
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    }
    if (signal?.aborted) {
      clearTimeout(timeout)
      onAbort()
      return
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export class GeodataUnavailableError extends Error {
  constructor(readonly sources: string) {
    super(sources)
    this.name = 'GeodataUnavailableError'
  }
}

export class GeodataTooLargeError extends Error {
  constructor() {
    super('Settlement is too large for this tool.')
    this.name = 'GeodataTooLargeError'
  }
}

function capElements(json: OsmJson): OsmJson {
  const elements = json.elements ?? []
  if (elements.length > APP_CONFIG.analysis.maxElementsPerPart) throw new GeodataTooLargeError()
  return json
}

function capMerged(json: OsmJson): OsmJson {
  const elements = json.elements ?? []
  if (elements.length > APP_CONFIG.analysis.maxMergedElements) throw new GeodataTooLargeError()
  return json
}

type PartQuery = ReturnType<typeof buildPartQueries>[number]

async function fetchBboxJson(
  item: PartQuery,
  box: LonLatBbox,
  signal: AbortSignal | undefined,
  endpoint: string | undefined,
  options: OverpassClientOptions,
): Promise<{ json: OsmJson; endpoint: string }> {
  const result = await postOverpassQuery(item.bboxQuery(box), signal, endpoint, options)
  const count = result.json.elements?.length ?? 0
  if (count <= APP_CONFIG.analysis.maxElementsPerPart) return result
  if (bboxSpanMeters(box) <= APP_CONFIG.overpass.minTileSizeM * 1.5) throw new GeodataTooLargeError()
  const parts: OsmJson[] = []
  let used = result.endpoint
  for (const quad of splitBbox(box)) {
    const sub = await fetchBboxJson(item, quad, signal, used, options)
    used = sub.endpoint
    parts.push(sub.json)
  }
  return { json: mergeOsmElements(parts), endpoint: used }
}

async function fetchPartInTiles(
  item: PartQuery,
  lat: number,
  lon: number,
  radius: number,
  signal: AbortSignal | undefined,
  endpoint: string | undefined,
  options: OverpassClientOptions,
  tilePauseMs = 0,
  tileM: number = APP_CONFIG.overpass.tileSizeM,
): Promise<{ json: OsmJson; endpoint: string }> {
  const tiles = coveringTiles(lat, lon, radius, tileM)
  const parts: OsmJson[] = []
  let used = endpoint
  for (const tile of tiles) {
    if (tilePauseMs > 0 && parts.length > 0) await wait(tilePauseMs, signal)
    const result = await fetchBboxJson(item, tile, signal, used, options)
    used = result.endpoint
    parts.push(result.json)
  }
  return { json: capMerged(mergeOsmElements(parts)), endpoint: used ?? APP_CONFIG.overpass.endpoints[0]! }
}

async function fetchPartJson(
  item: PartQuery,
  lat: number,
  lon: number,
  radius: number,
  signal: AbortSignal | undefined,
  endpoint: string | undefined,
  options: OverpassClientOptions = {},
  tilePauseMs = 0,
): Promise<{ json: OsmJson; endpoint: string }> {
  try {
    const part = await postOverpassQuery(item.query, signal, endpoint, options)
    return { json: capElements(part.json), endpoint: part.endpoint }
  } catch (error) {
    if (signal?.aborted) throw error
    // A single oversized query often times out. Split it instead of repeating the same request.
    if (error instanceof GeodataTooLargeError || error instanceof GeodataUnavailableError) {
      const tileM = radius >= APP_CONFIG.overpass.cityRadiusM ? 4_000 : APP_CONFIG.overpass.tileSizeM
      return fetchPartInTiles(item, lat, lon, radius, signal, endpoint, { ...options, maxPrimaryAttempts: 1 }, tilePauseMs, tileM)
    }
    throw error
  }
}

function polygonFeatures(features: Feature<Geometry, Record<string, unknown>>[]) {
  return features.filter((feature): feature is Feature<Polygon | MultiPolygon, Record<string, unknown>> =>
    feature.geometry?.type === 'Polygon' || feature.geometry?.type === 'MultiPolygon')
}

function lineFeatures(features: Feature<Geometry, Record<string, unknown>>[]) {
  return features.filter((feature): feature is Feature<LineString | MultiLineString, Record<string, unknown>> =>
    feature.geometry?.type === 'LineString' || feature.geometry?.type === 'MultiLineString')
}

function poiPoint(feature: Feature<Geometry, Record<string, unknown>>): Feature<Point, Record<string, unknown>> | null {
  if (feature.geometry.type === 'Point') return feature as Feature<Point, Record<string, unknown>>
  try {
    return centroid(feature, { properties: feature.properties ?? {} }) as Feature<Point, Record<string, unknown>>
  } catch {
    return null
  }
}

function slimProperties(feature: Feature<Geometry, Record<string, unknown>>) {
  const properties = feature.properties ?? {}
  feature.properties = {
    id: properties.id,
    type: properties.type,
    tags: tagsOf(feature),
  }
  return feature
}

function parse(data: unknown, endpoint: string): RawGeodata {
  const converted = osmtogeojson(data as Parameters<typeof osmtogeojson>[0]) as GeoJSON.FeatureCollection<Geometry, Record<string, unknown>>
  const features = converted.features.filter((feature) => feature.geometry).map(slimProperties)
  const polygons = polygonFeatures(features)
  const lines = lineFeatures(features)
  const buildings = polygons.filter((feature) => Boolean(tagsOf(feature).building))
  const roads = lines.filter((feature) => Boolean(tagsOf(feature).highway))
  const landuse = polygons.filter((feature) => {
    const tags = tagsOf(feature)
    return Boolean(tags.landuse || tags.natural || tags.leisure || tags.water || tags.waterway)
  })
  const pois = features
    .filter((feature) => {
      const tags = tagsOf(feature)
      return Boolean(tags.amenity || tags.sport)
    })
    .map(poiPoint)
    .filter((feature): feature is Feature<Point, Record<string, unknown>> => feature !== null)

  return {
    buildings: featureCollection(buildings),
    roads: featureCollection(roads),
    landuse: featureCollection(landuse),
    pois: featureCollection(pois),
    sourceEndpoint: endpoint,
    fetchedAt: new Date().toISOString(),
    source: 'overpass',
  } as RawGeodata
}

interface OverpassClientOptions {
  primaryTimeoutMs?: number
  mirrorTimeoutMs?: number
  maxPrimaryAttempts?: number
  backoffMs?: readonly number[]
}

async function postOverpassQuery(
  query: string,
  signal?: AbortSignal,
  preferred?: string,
  options: OverpassClientOptions = {},
): Promise<{ json: OsmJson; endpoint: string }> {
  const endpoints = APP_CONFIG.overpass.endpoints
  const primary = endpoints[0]
  const mirrors = endpoints.slice(1)
  const errors: string[] = []
  const primaryTimeoutMs = options.primaryTimeoutMs ?? PRIMARY_TIMEOUT_MS
  const mirrorTimeoutMs = options.mirrorTimeoutMs ?? MIRROR_TIMEOUT_MS
  const maxPrimaryAttempts = options.maxPrimaryAttempts ?? 3
  const backoffMs = options.backoffMs ?? PRIMARY_BACKOFF_MS

  if (primary) {
    const host = new URL(primary).host
    for (let attempt = 0; attempt < maxPrimaryAttempts; attempt += 1) {
      try {
        const response = await fetch(primary, {
          method: 'POST',
          signal: signalForEndpoint(signal, primaryTimeoutMs),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            Accept: '*/*',
            'User-Agent': 'ITT-Digital-Hub-Settlement-Analyzer/1.0 (https://ittdigitalhub.org; settlement-analyzer)',
          },
          body: new URLSearchParams({ data: query }),
        })
        if (response.ok) return { json: await response.json() as OsmJson, endpoint: primary }
        errors.push(`${host}: ${response.status}`)
        if ((response.status === 429 || response.status === 504) && attempt < maxPrimaryAttempts - 1) {
          await wait(backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 3000, signal)
          continue
        }
        break
      } catch (error) {
        if (signal?.aborted) throw error
        const timedOut = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
        errors.push(`${host}: ${timedOut ? 'timeout' : error instanceof Error ? error.message : 'unknown error'}`)
        if (attempt < maxPrimaryAttempts - 1) {
          await wait(backoffMs[attempt] ?? backoffMs[backoffMs.length - 1] ?? 3000, signal)
          continue
        }
      }
    }
  }

  const orderedMirrors = preferred && preferred !== primary
    ? [preferred, ...mirrors.filter((endpoint) => endpoint !== preferred)]
    : mirrors

  for (const endpoint of orderedMirrors) {
    const host = new URL(endpoint).host
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        signal: signalForEndpoint(signal, mirrorTimeoutMs),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Accept: '*/*',
          'User-Agent': 'ITT-Digital-Hub-Settlement-Analyzer/1.0 (https://ittdigitalhub.org; settlement-analyzer)',
        },
        body: new URLSearchParams({ data: query }),
      })
      if (response.ok) return { json: await response.json() as OsmJson, endpoint }
      errors.push(`${host}: ${response.status}`)
    } catch (error) {
      if (signal?.aborted) throw error
      const timedOut = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
      errors.push(`${host}: ${timedOut ? 'timeout' : error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  throw new GeodataUnavailableError(errors.join('; '))
}

function combineSignals(parent?: AbortSignal, timeoutMs?: number) {
  const extra = timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined
  const signals = [parent, extra].filter((signal): signal is AbortSignal => Boolean(signal))
  if (signals.length === 0) return undefined
  if (signals.length === 1) return signals[0]
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)
  const controller = new AbortController()
  const abort = () => controller.abort()
  for (const signal of signals) {
    signal.addEventListener('abort', abort)
    if (signal.aborted) controller.abort()
  }
  return controller.signal
}

function packToGeodata(pack: StoredSettlementPack): { radiusM: number; fetchedAt: string; raw: RawGeodata } {
  return {
    radiusM: pack.radiusM,
    fetchedAt: pack.fetchedAt,
    raw: { ...pack.raw, source: 'pack', fetchedAt: pack.fetchedAt, queryRadiusM: pack.radiusM },
  }
}

async function loadPack(ekatte: string, radiusM: number): Promise<{ radiusM: number; fetchedAt: string; raw: RawGeodata } | null> {
  try {
    const local = await readLocalPack(ekatte)
    if (local && local.radiusM >= radiusM) return packToGeodata(local)
  } catch {
    // IndexedDB is optional; fall through to shipped files.
  }
  try {
    const response = await fetch(`/settlement-packs/${ekatte}.json`, { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    const shipped = await response.json() as { radiusM: number; fetchedAt: string; raw: RawGeodata }
    if (shipped.radiusM < radiusM) return null
    return {
      radiusM: shipped.radiusM,
      fetchedAt: shipped.fetchedAt,
      raw: { ...shipped.raw, source: 'pack', fetchedAt: shipped.fetchedAt, queryRadiusM: shipped.radiusM },
    }
  } catch {
    return null
  }
}

export async function fetchSettlementGeodata(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  radiusM: number = APP_CONFIG.overpass.radiusM,
  onPart?: (part: OverpassPart) => void,
  ekatte?: string,
): Promise<RawGeodata> {
  const radius = Math.round(radiusM / 100) * 100
  if (ekatte) {
    const pack = await loadPack(ekatte, radius)
    if (pack) {
      onPart?.('buildings')
      return { ...pack.raw, source: 'pack', fetchedAt: pack.fetchedAt }
    }
  }
  const cacheKey = `settlement-data:v8:r${radius}:${lat.toFixed(4)}:${lon.toFixed(4)}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  const combined = combineSignals(signal, APP_CONFIG.overpass.overallTimeoutMs)
  const parts: OsmJson[] = []
  let endpoint: string | undefined = APP_CONFIG.overpass.endpoints[0]
  const errors: string[] = []
  for (const item of buildPartQueries(lat, lon, radius)) {
    if (combined?.aborted) {
      if (item.required) throw new GeodataUnavailableError(errors.join('; ') || 'timeout')
      parts.push({ elements: [] })
      continue
    }
    onPart?.(item.part)
    try {
      if (parts.length > 0) await new Promise((resolve) => setTimeout(resolve, 350))
      const liveOptions: OverpassClientOptions = radius >= APP_CONFIG.overpass.townRadiusM
        ? { maxPrimaryAttempts: 1, primaryTimeoutMs: 36_000 }
        : {}
      const part = await fetchPartJson(item, lat, lon, radius, combined, endpoint, liveOptions)
      endpoint = part.endpoint
      parts.push(part.json)
    } catch (error) {
      if (error instanceof GeodataTooLargeError) throw error
      if (item.required) throw error
      errors.push(error instanceof Error ? error.message : 'optional part failed')
      parts.push({ elements: [] })
    }
  }
  const merged: OsmJson = { elements: parts.flatMap((part) => part.elements ?? []) }
  const fallbackEndpoint = APP_CONFIG.overpass.endpoints[0] ?? 'https://overpass-api.de/api/interpreter'
  const result = parse(merged, endpoint ?? fallbackEndpoint)
  result.queryRadiusM = radius
  if (errors.length === 0) writeCache(cacheKey, result)
  return result
}

const PATIENT_OPTIONS: OverpassClientOptions = {
  primaryTimeoutMs: APP_CONFIG.overpass.packDownload.primaryTimeoutMs,
  mirrorTimeoutMs: APP_CONFIG.overpass.packDownload.mirrorTimeoutMs,
  maxPrimaryAttempts: APP_CONFIG.overpass.packDownload.maxPrimaryAttempts,
  backoffMs: APP_CONFIG.overpass.packDownload.backoffMs,
}

export async function downloadPackGeodata(
  lat: number,
  lon: number,
  radiusM: number,
  onProgress: (progress: PackDownloadProgress) => void,
  signal?: AbortSignal,
): Promise<RawGeodata> {
  const radius = Math.round(radiusM / 100) * 100
  const queries = buildPartQueries(lat, lon, radius, APP_CONFIG.overpass.packDownload.partTimeoutSeconds)
  const parts: OsmJson[] = []
  let endpoint: string | undefined = APP_CONFIG.overpass.endpoints[0]
  const { partRetries, pauseBetweenPartsMs, retryPauseMs } = APP_CONFIG.overpass.packDownload

  for (const [index, item] of queries.entries()) {
    if (signal?.aborted) throw new GeodataUnavailableError('cancelled')
    onProgress(packDownloadProgress(item.part, 'start'))
    let lastError: unknown
    let collected: OsmJson | undefined
    for (let round = 1; round <= partRetries; round += 1) {
      if (signal?.aborted) throw new GeodataUnavailableError('cancelled')
      if (round > 1) onProgress(packDownloadProgress(item.part, 'retry', round))
      try {
        const part = await fetchPartJson(item, lat, lon, radius, signal, endpoint, PATIENT_OPTIONS, 400)
        endpoint = part.endpoint
        collected = part.json
        break
      } catch (error) {
        if (error instanceof GeodataTooLargeError) throw error
        lastError = error
        if (round < partRetries) await wait(retryPauseMs, signal)
      }
    }
    if (!collected) {
      if (item.required) {
        throw lastError instanceof Error ? lastError : new GeodataUnavailableError('download failed')
      }
      parts.push({ elements: [] })
    } else {
      parts.push(collected)
    }
    onProgress(packDownloadProgress(item.part, 'done'))
    if (index < queries.length - 1) await wait(pauseBetweenPartsMs, signal)
  }

  const merged: OsmJson = { elements: parts.flatMap((part) => part.elements ?? []) }
  const fallbackEndpoint = APP_CONFIG.overpass.endpoints[0] ?? 'https://overpass-api.de/api/interpreter'
  const result = parse(merged, endpoint ?? fallbackEndpoint)
  result.source = 'pack'
  result.queryRadiusM = radius
  return result
}
