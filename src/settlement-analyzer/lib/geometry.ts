// @ts-nocheck — inherited GIS engine; keep runtime behaviour.
import {
  area,
  along,
  bbox,
  bboxPolygon,
  buffer,
  booleanPointInPolygon,
  centerOfMass,
  cleanCoords,
  concave,
  destination,
  difference,
  distance,
  featureCollection,
  flattenEach,
  intersect,
  length,
  lineSplit,
  point,
  polygon,
  simplify,
  union,
} from '@turf/turf'
import type { Feature, FeatureCollection, LineString, MultiLineString, MultiPolygon, Point, Polygon, Position } from 'geojson'
import { APP_CONFIG } from '../config'
import type { LineFeature, PolygonFeature } from '../types'

export function asPolygonFeature(feature: Feature<Polygon | MultiPolygon>): PolygonFeature {
  return feature as PolygonFeature
}

export function safeArea(feature: Feature<Polygon | MultiPolygon> | null | undefined) {
  if (!feature) return 0
  try { return area(feature) } catch { return 0 }
}

function simplifyLoose(feature: Feature<Polygon | MultiPolygon>): PolygonFeature {
  try {
    return simplify(feature, { tolerance: 0.0001, highQuality: false }) as PolygonFeature
  } catch {
    return asPolygonFeature(feature)
  }
}

function unionMany(features: Feature<Polygon | MultiPolygon>[]): PolygonFeature | null {
  if (features.length === 0) return null
  if (features.length === 1) return asPolygonFeature(features[0])
  try {
    return union(featureCollection(features)) as PolygonFeature | null
  } catch {
    let current: PolygonFeature | null = asPolygonFeature(features[0])
    for (const feature of features.slice(1)) {
      if (!current) { current = asPolygonFeature(feature); continue }
      try { current = union(featureCollection([current, feature])) as PolygonFeature | null } catch { /* preserve usable geometry */ }
    }
    return current
  }
}

export function safeUnion(features: Array<Feature<Polygon | MultiPolygon> | null | undefined>): PolygonFeature | null {
  const valid = features.filter((feature): feature is Feature<Polygon | MultiPolygon> => Boolean(feature && safeArea(feature) > 0.01))
  if (valid.length === 0) return null
  if (valid.length === 1) return asPolygonFeature(valid[0])
  const max = APP_CONFIG.analysis.maxUnionFeatures
  const chunk = APP_CONFIG.analysis.unionChunkSize
  const limited = valid.length > max ? takeEvenly(valid, max) : valid
  if (limited.length <= chunk) return unionMany(limited)
  const parts: PolygonFeature[] = []
  for (let index = 0; index < limited.length; index += chunk) {
    const merged = unionMany(limited.slice(index, index + chunk))
    if (merged) parts.push(simplifyLoose(merged))
  }
  return unionMany(parts)
}

export function safeIntersect(a: Feature<Polygon | MultiPolygon> | null, b: Feature<Polygon | MultiPolygon> | null): PolygonFeature | null {
  if (!a || !b) return null
  try { return intersect(featureCollection([a, b])) as PolygonFeature | null } catch { return null }
}

export function safeDifference(a: Feature<Polygon | MultiPolygon> | null, b: Feature<Polygon | MultiPolygon> | null): PolygonFeature | null {
  if (!a) return null
  if (!b) return asPolygonFeature(a)
  try { return difference(featureCollection([a, b])) as PolygonFeature | null } catch { return asPolygonFeature(a) }
}

export function safeBuffer(feature: Feature, radiusM: number): PolygonFeature | null {
  try { return buffer(feature, radiusM, { units: 'meters', steps: 6 }) as PolygonFeature | null } catch { return null }
}

export function clipPolygon(feature: Feature<Polygon | MultiPolygon> | null, boundary: PolygonFeature) {
  return safeIntersect(feature, boundary)
}

export function clipCollectionToBoundary(
  collection: FeatureCollection | null,
  boundary: PolygonFeature,
): FeatureCollection | null {
  if (!collection) return null
  const boundaryBox = bbox(boundary)
  const features: Feature<Polygon | MultiPolygon, Record<string, unknown>>[] = []
  for (const feature of collection.features) {
    if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) continue
    try {
      const box = bbox(feature)
      if (box[2] < boundaryBox[0] || box[0] > boundaryBox[2] || box[3] < boundaryBox[1] || box[1] > boundaryBox[3]) continue
      const clipped = clipPolygon(feature, boundary)
      if (clipped && safeArea(clipped) > 1) {
        features.push({ ...feature, geometry: clipped.geometry, properties: feature.properties ?? {} })
      }
    } catch {
      // Skip invalid cadastre parcels instead of aborting the overlay.
    }
  }
  return featureCollection(features)
}

function lineMidpointInside(lineFeature: Feature<LineString, Record<string, unknown>>, boundary: PolygonFeature) {
  const mid = along(lineFeature, length(lineFeature, { units: 'kilometers' }) / 2, { units: 'kilometers' })
  return booleanPointInPolygon(mid, boundary)
}

export function clipLines(
  collection: FeatureCollection<LineString | MultiLineString, Record<string, unknown>>,
  boundary: PolygonFeature,
) {
  const boundaryBox = bbox(boundary)
  const clipped: Feature<LineString, Record<string, unknown>>[] = []
  const precise = collection.features.length <= APP_CONFIG.analysis.maxClipLinesPrecise
  collection.features.forEach((feature) => {
    const lineBox = bbox(feature)
    if (lineBox[2] < boundaryBox[0] || lineBox[0] > boundaryBox[2] || lineBox[3] < boundaryBox[1] || lineBox[1] > boundaryBox[3]) return
    flattenEach(feature, (line) => {
      try {
        const lineFeature = line as Feature<LineString, Record<string, unknown>>
        if (!precise) {
          if (lineMidpointInside(lineFeature, boundary)) clipped.push(lineFeature)
          return
        }
        const segments = lineSplit(lineFeature, boundary)
        if (segments.features.length === 0) {
          if (lineMidpointInside(lineFeature, boundary)) clipped.push(lineFeature)
          return
        }
        segments.features.forEach((segment) => {
          const segmentLength = length(segment, { units: 'kilometers' })
          const mid = along(segment, segmentLength / 2, { units: 'kilometers' })
          if (booleanPointInPolygon(mid, boundary)) {
            segment.properties = feature.properties ?? {}
            clipped.push(segment as Feature<LineString, Record<string, unknown>>)
          }
        })
      } catch {
        // Invalid lines are ignored instead of aborting the entire settlement analysis.
      }
    })
  })
  return featureCollection(clipped)
}

export function safeLength(feature: LineFeature) {
  try { return length(feature, { units: 'kilometers' }) * 1000 } catch { return 0 }
}

function featureCenter(feature: Feature<Polygon | MultiPolygon>): Feature<Point> {
  try { return centerOfMass(feature) } catch { return point(bbox(feature).slice(0, 2) as Position) }
}

function gridKey(lon: number, lat: number, cellM: number) {
  const latM = lat * 111_320
  const lonM = lon * 111_320 * Math.cos((lat * Math.PI) / 180)
  return `${Math.floor(lonM / cellM)}:${Math.floor(latM / cellM)}`
}

function clusterBbox(cluster: Array<{ center: Feature<Point> }>) {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const item of cluster) {
    const [lon, lat] = item.center.geometry.coordinates
    if (lon < minLon) minLon = lon
    if (lat < minLat) minLat = lat
    if (lon > maxLon) maxLon = lon
    if (lat > maxLat) maxLat = lat
  }
  return [minLon, minLat, maxLon, maxLat] as const
}

function clusterGapMeters(
  merged: Array<{ center: Feature<Point> }>,
  candidate: Array<{ center: Feature<Point> }>,
  lat: number,
  bridgeM: number,
) {
  const boxGap = bboxGapMeters(clusterBbox(merged), clusterBbox(candidate), lat)
  if (boxGap > bridgeM) return boxGap
  const cellM = Math.max(80, bridgeM / 2)
  const grid = new Map<string, Feature<Point>[]>()
  for (const item of merged) {
    const [lon, pointLat] = item.center.geometry.coordinates
    const key = gridKey(lon, pointLat, cellM)
    const bucket = grid.get(key)
    if (bucket) bucket.push(item.center)
    else grid.set(key, [item.center])
  }
  let best = Number.POSITIVE_INFINITY
  const reach = 1 + Math.ceil(bridgeM / cellM)
  for (const item of candidate) {
    const [lon, pointLat] = item.center.geometry.coordinates
    const [cx, cy] = gridKey(lon, pointLat, cellM).split(':').map(Number)
    for (let dx = -reach; dx <= reach; dx += 1) {
      for (let dy = -reach; dy <= reach; dy += 1) {
        const bucket = grid.get(`${cx + dx}:${cy + dy}`)
        if (!bucket) continue
        for (const center of bucket) {
          const gap = distance(item.center, center, { units: 'meters' })
          if (gap < best) best = gap
          if (best <= bridgeM) return best
        }
      }
    }
  }
  return best
}

function bboxGapMeters(
  a: readonly [number, number, number, number],
  b: readonly [number, number, number, number],
  lat: number,
) {
  const overlapX = a[0] <= b[2] && a[2] >= b[0]
  const overlapY = a[1] <= b[3] && a[3] >= b[1]
  if (overlapX && overlapY) return 0
  const dLat = 111_320
  const dLon = 111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  const gapX = overlapX ? 0 : (a[2] < b[0] ? b[0] - a[2] : a[0] - b[2])
  const gapY = overlapY ? 0 : (a[3] < b[1] ? b[1] - a[3] : a[1] - b[3])
  return Math.hypot(gapX * dLon, gapY * dLat)
}

export function clusterBuildings(
  buildings: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>,
  settlementCenter: Feature<Point>,
  maxDistanceM = APP_CONFIG.boundary.centerPreferenceM,
  options?: { seed?: 'largest' | 'nearest'; bridgeM?: number; minSecondary?: number; includeInside?: PolygonFeature },
) {
  return settledClusterGroups(buildings, settlementCenter, maxDistanceM, options).flat()
}

function settledClusterGroups(
  buildings: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>,
  settlementCenter: Feature<Point>,
  maxDistanceM = APP_CONFIG.boundary.centerPreferenceM,
  options?: { seed?: 'largest' | 'nearest'; bridgeM?: number; minSecondary?: number; includeInside?: PolygonFeature },
) {
  const cellM = APP_CONFIG.boundary.clusterDistanceM
  const centers = buildings.features.map((feature, index) => ({ feature, center: featureCenter(feature), index }))
  const grid = new Map<string, typeof centers>()
  for (const item of centers) {
    const [lon, lat] = item.center.geometry.coordinates
    const key = gridKey(lon, lat, cellM)
    const bucket = grid.get(key)
    if (bucket) bucket.push(item)
    else grid.set(key, [item])
  }
  const visited = new Set<number>()
  const clusters: typeof centers[] = []

  for (const item of centers) {
    if (visited.has(item.index)) continue
    const cluster: typeof centers = []
    const queue = [item]
    visited.add(item.index)
    while (queue.length) {
      const current = queue.shift()!
      cluster.push(current)
      const [lon, lat] = current.center.geometry.coordinates
      const [cx, cy] = gridKey(lon, lat, cellM).split(':').map(Number)
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          const bucket = grid.get(`${cx + dx}:${cy + dy}`)
          if (!bucket) continue
          for (const candidate of bucket) {
            if (visited.has(candidate.index)) continue
            if (distance(current.center, candidate.center, { units: 'meters' }) <= APP_CONFIG.boundary.clusterDistanceM) {
              visited.add(candidate.index)
              queue.push(candidate)
            }
          }
        }
      }
    }
    clusters.push(cluster)
  }

  const insideMask = (cluster: typeof centers) => {
    const mask = options?.includeInside
    if (!mask) return false
    return cluster.some((item) => {
      try { return booleanPointInPolygon(item.center, mask) } catch { return false }
    })
  }

  const ranked = (clusters.length ? clusters : [])
    .map((cluster) => ({
      cluster,
      nearestToSettlementM: Math.min(...cluster.map((item) => distance(item.center, settlementCenter, { units: 'meters' }))),
    }))
    .filter(({ cluster, nearestToSettlementM }) => nearestToSettlementM <= maxDistanceM || insideMask(cluster))
    .sort((a, b) => (
      options?.seed === 'nearest'
        ? a.nearestToSettlementM - b.nearestToSettlementM || b.cluster.length - a.cluster.length
        : b.cluster.length - a.cluster.length || a.nearestToSettlementM - b.nearestToSettlementM
    ))

  const eligible = ranked.filter(({ cluster }) => cluster.length >= APP_CONFIG.boundary.minimumClusterSize)
  const primary = (eligible[0] ?? ranked[0])?.cluster ?? []
  if (primary.length === 0) return []

  const minimumSecondarySize = options?.minSecondary ?? Math.max(
    APP_CONFIG.boundary.secondaryClusterMinSize,
    Math.ceil(primary.length * APP_CONFIG.boundary.secondaryClusterMinRatio),
  )
  const bridgeM = options?.bridgeM ?? APP_CONFIG.boundary.clusterBridgeDistanceM
  const groups: typeof centers[] = [primary]
  const merged = [...primary]
  const remaining = ranked.filter(({ cluster }) => cluster !== primary && cluster.length >= minimumSecondarySize)
  const settlementLat = settlementCenter.geometry.coordinates[1]

  // A settlement can have several built-up neighbourhoods separated by a wider
  // road, river or undeveloped strip. Join only substantial nearby clusters;
  // isolated farms and single buildings remain excluded.
  let added = true
  while (added) {
    added = false
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      const candidate = remaining[index].cluster
      if (clusterGapMeters(merged, candidate, settlementLat, bridgeM) <= bridgeM || insideMask(candidate)) {
        groups.push(candidate)
        merged.push(...candidate)
        remaining.splice(index, 1)
        added = true
      }
    }
  }
  return groups
}

export function dataRadiusForBoundary(boundary: PolygonFeature, lat: number, lon: number) {
  const [west, south, east, north] = bbox(boundary)
  const center = point([lon, lat])
  const farthestCornerM = Math.max(
    distance(center, point([west, south]), { units: 'meters' }),
    distance(center, point([west, north]), { units: 'meters' }),
    distance(center, point([east, south]), { units: 'meters' }),
    distance(center, point([east, north]), { units: 'meters' }),
  )
  return Math.ceil((farthestCornerM + APP_CONFIG.overpass.editedBoundaryPaddingM) / 100) * 100
}

function thinCenters(centers: Feature<Point>[]) {
  const maxPoints = APP_CONFIG.boundary.connectedHullGridMaxPoints
  if (centers.length <= maxPoints) return centers
  const cellM = APP_CONFIG.boundary.clusterDistanceM
  const seen = new Set<string>()
  const thinned: Feature<Point>[] = []
  for (const center of centers) {
    const [lon, lat] = center.geometry.coordinates
    const key = gridKey(lon, lat, cellM)
    if (seen.has(key)) continue
    seen.add(key)
    thinned.push(center)
  }
  return thinned
}

function hullAndBuffer(centers: Feature<Point>[], maxEdgeM = APP_CONFIG.boundary.clusterDistanceM * 2.4): PolygonFeature | null {
  const input = thinCenters(centers)
  if (input.length < 3) return null
  const collection = featureCollection(input)
  let hull: PolygonFeature | null = null
  try { hull = concave(collection, { maxEdge: maxEdgeM, units: 'meters' }) as PolygonFeature | null } catch { hull = null }
  if (!hull) hull = bboxPolygon(bbox(collection)) as PolygonFeature
  const buffered = safeBuffer(hull, APP_CONFIG.boundary.buildingBufferM)
  if (!buffered) return null
  try {
    return cleanCoords(simplify(buffered, { tolerance: APP_CONFIG.boundary.simplifyTolerance, highQuality: true })) as PolygonFeature
  } catch {
    return buffered
  }
}

function boundaryFromGroups(
  groups: Array<Array<{ center: Feature<Point> }>>,
  mask?: PolygonFeature | null,
  maxEdgeM = APP_CONFIG.boundary.clusterDistanceM * 2.4,
) {
  const hulls = groups
    .map((group) => hullAndBuffer(group.map((item) => item.center), maxEdgeM))
    .filter((hull): hull is PolygonFeature => Boolean(hull))
  return clipToMask(safeUnion(hulls), mask)
}

function clipToMask(hull: PolygonFeature | null, mask?: PolygonFeature | null) {
  if (!hull || !mask) return hull
  return safeIntersect(hull, mask) ?? hull
}

export function boundaryFromBuildingCluster(
  buildings: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>,
  lat: number,
  lon: number,
  maxDistanceM = APP_CONFIG.boundary.centerPreferenceM,
  mask?: PolygonFeature | null,
): PolygonFeature | null {
  const groups = settledClusterGroups(buildings, point([lon, lat]), maxDistanceM, { includeInside: mask ?? undefined })
  return boundaryFromGroups(groups, mask)
}

export function boundaryFromBuildingSample(
  buildings: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>,
  lat: number,
  lon: number,
  maxDistanceM = APP_CONFIG.boundary.centerPreferenceM,
  maxPoints = 800,
): PolygonFeature | null {
  const center = point([lon, lat])
  const nearby: Feature<Point>[] = []
  for (const feature of buildings.features) {
    const featurePoint = featureCenter(feature)
    if (distance(featurePoint, center, { units: 'meters' }) <= maxDistanceM) nearby.push(featurePoint)
  }
  if (nearby.length < 3) return null
  const sampled = nearby.length <= maxPoints
    ? nearby
    : Array.from({ length: maxPoints }, (_, index) => nearby[Math.min(nearby.length - 1, Math.floor((index * nearby.length) / maxPoints))]!)
  return hullAndBuffer(sampled, 1200)
}

export function boundaryFromConnectedBuildings(
  buildings: FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>,
  lat: number,
  lon: number,
  bridgeM = APP_CONFIG.boundary.clusterBridgeDistanceM,
  mask?: PolygonFeature | null,
): PolygonFeature | null {
  const groups = settledClusterGroups(
    buildings,
    point([lon, lat]),
    Number.POSITIVE_INFINITY,
    {
      seed: 'nearest',
      bridgeM,
      minSecondary: APP_CONFIG.boundary.minimumClusterSize,
      includeInside: mask ?? undefined,
    },
  )
  if (groups.flat().length < 3) return null
  return boundaryFromGroups(groups, mask, Math.min(bridgeM, APP_CONFIG.boundary.connectedHullMaxEdgeM))
}

export function sampleFeaturesForDisplay<T>(features: T[], max: number, pointOf: (feature: T) => [number, number] | null) {
  if (features.length <= max) return features
  const cellM = 90
  const seen = new Set<string>()
  const spread: T[] = []
  const rest: T[] = []
  for (const feature of features) {
    const coords = pointOf(feature)
    if (!coords) { rest.push(feature); continue }
    const key = gridKey(coords[0], coords[1], cellM)
    if (seen.has(key)) rest.push(feature)
    else { seen.add(key); spread.push(feature) }
  }
  if (spread.length >= max) return takeEvenly(spread, max)
  return [...spread, ...takeEvenly(rest, max - spread.length)]
}

function takeEvenly<T>(items: T[], max: number) {
  if (items.length <= max) return items
  const step = items.length / max
  return Array.from({ length: max }, (_, index) => items[Math.min(items.length - 1, Math.floor(index * step))]!)
}

export function fallbackBoundary(lat: number, lon: number): PolygonFeature {
  const center = point([lon, lat])
  const bearings = Array.from({ length: 48 }, (_, index) => index * 7.5)
  const ring = bearings.map((bearing) => destination(center, APP_CONFIG.boundary.fallbackRadiusM, bearing, { units: 'meters' }).geometry.coordinates)
  ring.push(ring[0])
  return polygon([ring]) as PolygonFeature
}

export function validateSettlementPolygon(
  geometry: GeoJSON.Geometry | undefined,
  lat: number,
  lon: number,
  limits?: { maximumAreaKm2?: number; maximumCentroidOffsetM?: number; containsCenter?: boolean },
): PolygonFeature | null {
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) return null
  const feature = { type: 'Feature', properties: {}, geometry } as PolygonFeature
  const areaKm2 = safeArea(feature) / 1_000_000
  const maximumAreaKm2 = limits?.maximumAreaKm2 ?? APP_CONFIG.boundary.maximumAreaKm2
  const maximumCentroidOffsetM = limits?.maximumCentroidOffsetM ?? APP_CONFIG.boundary.maximumCentroidOffsetM
  if (areaKm2 < APP_CONFIG.boundary.minimumAreaKm2 || areaKm2 > maximumAreaKm2) return null
  const center = point([lon, lat])
  try {
    if (limits?.containsCenter) {
      if (booleanPointInPolygon(center, feature)) return feature
      const near = safeBuffer(feature, 400)
      if (near && booleanPointInPolygon(center, near)) return feature
      return null
    }
    const offset = distance(centerOfMass(feature), center, { units: 'meters' })
    if (offset > maximumCentroidOffsetM) return null
  } catch { return null }
  return feature
}

export function roadWidthM(road: Feature<LineString | MultiLineString, Record<string, unknown>>) {
  const properties = road.properties ?? {}
  const tags = (properties.tags as Record<string, string> | undefined) ?? properties as Record<string, string>
  const explicitWidth = Number.parseFloat(tags.width)
  if (Number.isFinite(explicitWidth) && explicitWidth > 1 && explicitWidth < 40) return explicitWidth
  return APP_CONFIG.roads.defaultWidthM[tags.highway] ?? 5
}

export function estimatedRoadAreaM2(
  roads: FeatureCollection<LineString | MultiLineString, Record<string, unknown>>,
) {
  return roads.features.reduce((total, road) => total + safeLength(road) * roadWidthM(road), 0)
}

export function roadArea(
  roads: FeatureCollection<LineString | MultiLineString, Record<string, unknown>>,
): PolygonFeature | null {
  if (roads.features.length === 0 || roads.features.length > APP_CONFIG.analysis.maxRoadBuffers) return null
  return safeUnion(roads.features.map((road) => safeBuffer(road, roadWidthM(road) / 2)))
}
