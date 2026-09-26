// @ts-nocheck — inherited GIS engine; keep runtime behaviour.
import { area, bbox, booleanPointInPolygon, distance, featureCollection, point } from '@turf/turf'
import type { Feature, MultiPolygon, Point, Polygon } from 'geojson'
import { APP_CONFIG, CATEGORY_META, CATEGORY_ORDER, CATEGORY_PRIORITY } from '../config'
import { classifyBuilding, classifyLanduse } from '../lib/classification'
import {
  boundaryFromBuildingCluster,
  boundaryFromConnectedBuildings,
  clipLines,
  clipPolygon,
  estimatedRoadAreaM2,
  fallbackBoundary,
  roadArea,
  safeArea,
  safeBuffer,
  safeDifference,
  safeIntersect,
  safeLength,
  safeUnion,
  validateSettlementPolygon,
} from '../lib/geometry'
import type {
  AnalysisResult,
  AnalysisWarningCode,
  BoundaryReasonCode,
  BuildingMetrics,
  CategoryKey,
  CategoryResult,
  ConfidenceLevel,
  ConfidenceReason,
  ConfidenceResult,
  OsmFeatureProperties,
  PolygonFeature,
  RawGeodata,
  SettlementProfileCode,
  SettlementResult,
} from '../types'

function featureCenterPoint(feature: Feature<Polygon | MultiPolygon>) {
  try {
    const [west, south, east, north] = bbox(feature)
    return point([(west + east) / 2, (south + north) / 2])
  } catch {
    return null
  }
}

function insideBoundary<T extends Polygon | MultiPolygon>(feature: Feature<T>, boundary: PolygonFeature) {
  const center = featureCenterPoint(feature)
  if (!center) return false
  try { return booleanPointInPolygon(center, boundary) } catch { return false }
}

function bufferedBuildings(
  features: Feature<Polygon | MultiPolygon, OsmFeatureProperties>[],
  radiusM: number,
) {
  if (features.length > APP_CONFIG.analysis.maxBufferedBuildings) return null
  return safeUnion(features.map((feature) => safeBuffer(feature, radiusM)))
}

export function analysisRadiusForSettlement(settlement: Pick<SettlementResult, 'type'>) {
  if (settlement.type === 'city') return APP_CONFIG.overpass.cityRadiusM
  if (settlement.type === 'town') return APP_CONFIG.overpass.townRadiusM
  return APP_CONFIG.overpass.radiusM
}

export function packRadiusForSettlement(settlement: Pick<SettlementResult, 'type'>) {
  if (settlement.type === 'city') return APP_CONFIG.overpass.cityPackRadiusM
  if (settlement.type === 'town') return APP_CONFIG.overpass.townPackRadiusM
  return APP_CONFIG.overpass.radiusM
}

function polygonValidationLimits(settlement: SettlementResult) {
  if (settlement.type !== 'city') return undefined
  return {
    maximumAreaKm2: APP_CONFIG.boundary.cityMaximumAreaKm2,
    maximumCentroidOffsetM: APP_CONFIG.boundary.cityMaximumCentroidOffsetM,
  }
}

function boundaryFromResidentialLanduse(settlement: SettlementResult, raw: RawGeodata, mask?: PolygonFeature | null) {
  const urbanLanduse = settlement.type === 'city' || settlement.type === 'town'
  const centerPreferenceM = urbanLanduse ? APP_CONFIG.boundary.landuseCenterPreferenceM : 600
  const bridgeDistanceM = urbanLanduse ? APP_CONFIG.boundary.landuseBridgeDistanceM : 280
  const settlementCenter = point([settlement.lon, settlement.lat])
  const residential = raw.landuse.features.filter((feature) => classifyLanduse(feature) === 'residential')
  const selected: typeof residential = []
  const remaining: typeof residential = []
  for (const feature of residential) {
    if (mask && !featureIntersectsMask(feature, mask)) continue
    const center = featureCenterPoint(feature)
    try {
      if (booleanPointInPolygon(settlementCenter, feature)
        || (center && distance(center, settlementCenter, { units: 'meters' }) <= centerPreferenceM)) {
        selected.push(feature)
      } else {
        remaining.push(feature)
      }
    } catch {
      remaining.push(feature)
    }
  }

  // Grow from the central residential areas across short gaps caused by roads,
  // rivers or unmapped strips. Distance is measured on the polygons themselves,
  // so a nearby village is not joined just because bounding boxes overlap.
  let expanded = true
  let guard = 0
  while (expanded && remaining.length && guard < 40) {
    expanded = false
    guard += 1
    const envelope = safeUnion(selected)
    const bridge = envelope ? safeBuffer(envelope, bridgeDistanceM) : null
    if (!bridge) break
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (safeIntersect(bridge, remaining[index])) {
        selected.push(remaining[index])
        remaining.splice(index, 1)
        expanded = true
      }
    }
  }

  const envelope = safeUnion(selected)
  const buffered = envelope ? safeBuffer(envelope, APP_CONFIG.boundary.landuseBufferM) : null
  const clipped = buffered && mask ? safeIntersect(buffered, mask) ?? buffered : buffered
  return validateSettlementPolygon(clipped?.geometry, settlement.lat, settlement.lon, polygonValidationLimits(settlement))
}

function featureIntersectsMask(feature: Feature<Polygon | MultiPolygon>, mask: PolygonFeature) {
  const center = featureCenterPoint(feature)
  if (!center) return false
  try { return booleanPointInPolygon(center, mask) } catch { return false }
}

function placeMask(settlement: SettlementResult) {
  return validateSettlementPolygon(settlement.geojson, settlement.lat, settlement.lon, {
    ...(polygonValidationLimits(settlement) ?? {}),
    containsCenter: true,
  })
}

function inclusionRadiusM(settlement: SettlementResult) {
  if (settlement.type === 'city') return APP_CONFIG.boundary.cityCenterPreferenceM
  if (settlement.type === 'town') return APP_CONFIG.boundary.townCenterPreferenceM
  return APP_CONFIG.boundary.centerPreferenceM
}

function buildingsReachDataEdge(
  buildings: Feature<Polygon | MultiPolygon, OsmFeatureProperties>[],
  lat: number,
  lon: number,
  radiusM: number,
) {
  const center = point([lon, lat])
  const limit = radiusM * APP_CONFIG.boundary.dataEdgeFraction
  for (const feature of buildings) {
    const featurePoint = featureCenterPoint(feature)
    if (!featurePoint) continue
    try {
      if (distance(featurePoint, center, { units: 'meters' }) >= limit) return true
    } catch { /* skip invalid building geometry */ }
  }
  return false
}

function chooseBoundary(settlement: SettlementResult, raw: RawGeodata, manual?: PolygonFeature) {
  if (manual) return { boundary: manual, method: 'open-polygon' as const, reason: 'manual' satisfies BoundaryReasonCode }
  const mask = placeMask(settlement)
  const openPolygon = validateSettlementPolygon(settlement.geojson, settlement.lat, settlement.lon, polygonValidationLimits(settlement))
  const landusePolygon = boundaryFromResidentialLanduse(settlement, raw, mask)
  const buildingCount = raw.buildings.features.length
  const isUrban = settlement.type === 'city' || settlement.type === 'town'
  const minimumPlausibleAreaM2 = settlement.type === 'hamlet' || settlement.type === 'isolated_dwelling' ? 40_000 : 200_000
  const maxDistanceM = inclusionRadiusM(settlement)
  let clusteredCache: PolygonFeature | null | undefined
  const clusterPolygon = () => {
    if (clusteredCache !== undefined) return clusteredCache
    if (buildingCount === 0) clusteredCache = null
    else if (isUrban) {
      clusteredCache = boundaryFromConnectedBuildings(
        raw.buildings,
        settlement.lat,
        settlement.lon,
        APP_CONFIG.boundary.cityClusterBridgeDistanceM,
        mask,
      )
    } else {
      clusteredCache = boundaryFromBuildingCluster(raw.buildings, settlement.lat, settlement.lon, maxDistanceM, mask)
    }
    return clusteredCache
  }
  const clusteredOk = () => {
    const clustered = clusterPolygon()
    return clustered && safeArea(clustered) >= minimumPlausibleAreaM2 ? clustered : null
  }

  if (openPolygon && safeArea(openPolygon) >= minimumPlausibleAreaM2) {
    const clustered = clusterPolygon()
    const clusterArea = safeArea(clustered)
    if (clustered && clusterArea > 0) {
      const openArea = safeArea(openPolygon)
      const proportionate = openArea >= clusterArea * 0.55 && openArea <= Math.max(clusterArea * 3.2, 3_000_000)
      if (proportionate) {
        return { boundary: openPolygon, method: 'open-polygon' as const, reason: 'openGeometry' satisfies BoundaryReasonCode }
      }
    } else if (!isUrban) {
      return { boundary: openPolygon, method: 'open-polygon' as const, reason: 'openGeometry' satisfies BoundaryReasonCode }
    }
  }
  // Cities often have incomplete OSM residential landuse. A hull of mapped
  // buildings follows the built-up area more closely than a few landuse patches.
  const clustered = isUrban ? clusteredOk() : null
  if (clustered) {
    return { boundary: clustered, method: 'dominant-building-cluster' as const, reason: 'buildingCluster' satisfies BoundaryReasonCode }
  }
  if (!isUrban) {
    const villageClustered = clusteredOk()
    const landArea = safeArea(landusePolygon)
    const clusterArea = safeArea(villageClustered)
    // A residential-landuse polygon that is much larger than the built cluster
    // has usually bridged into the next settlement or into unbuilt land.
    if (villageClustered && buildingCount >= 80 && landArea > clusterArea * 1.6) {
      return { boundary: villageClustered, method: 'dominant-building-cluster' as const, reason: 'buildingCluster' satisfies BoundaryReasonCode }
    }
  }
  if (landusePolygon && safeArea(landusePolygon) >= minimumPlausibleAreaM2) {
    return { boundary: landusePolygon, method: 'open-polygon' as const, reason: 'residentialLanduse' satisfies BoundaryReasonCode }
  }
  if (openPolygon && safeArea(openPolygon) >= minimumPlausibleAreaM2) {
    return { boundary: openPolygon, method: 'open-polygon' as const, reason: 'openGeometry' satisfies BoundaryReasonCode }
  }
  const villageClustered = clusteredOk()
  if (villageClustered) {
    return { boundary: villageClustered, method: 'dominant-building-cluster' as const, reason: 'buildingCluster' satisfies BoundaryReasonCode }
  }
  return {
    boundary: fallbackBoundary(settlement.lat, settlement.lon),
    method: 'center-buffer' as const,
    reason: 'centerBuffer' satisfies BoundaryReasonCode,
  }
}

function buildingMetrics(
  buildings: Feature<Polygon | MultiPolygon, OsmFeatureProperties>[],
  analysisAreaM2: number,
  residentialLand?: PolygonFeature | null,
): BuildingMetrics {
  const counts = { residential: 0, industrial: 0, other: 0, unknown: 0 }
  let footprintM2 = 0
  buildings.forEach((building) => {
    const center = featureCenterPoint(building)
    const insideResidential = Boolean(residentialLand && center && (() => {
      try { return booleanPointInPolygon(center, residentialLand) } catch { return false }
    })())
    counts[classifyBuilding(building, { insideResidentialLanduse: insideResidential })] += 1
    footprintM2 += safeArea(building)
  })
  const total = buildings.length
  const areaHa = analysisAreaM2 / 10_000
  const classified = total - counts.unknown
  return {
    total,
    ...counts,
    footprintM2,
    builtUpPercent: analysisAreaM2 ? footprintM2 / analysisAreaM2 * 100 : 0,
    perHa: areaHa ? total / areaHa : 0,
    residentialPerHa: areaHa ? counts.residential / areaHa : 0,
    averageFootprintM2: total ? footprintM2 / total : 0,
    classifiedPercent: total ? classified / total * 100 : 0,
  }
}

function settlementProfile(categories: CategoryResult[], builtUpPercent: number): SettlementProfileCode {
  const byKey = Object.fromEntries(categories.map((category) => [category.key, category.percent])) as Record<CategoryKey, number>
  if (byKey.agricultural >= APP_CONFIG.profiles.agriculturalDominantMin) return 'agriculturalDominant'
  if (byKey.industrial >= APP_CONFIG.profiles.mixedIndustrialMin && byKey.residential >= 12) return 'mixedResidentialIndustrial'
  if (builtUpPercent < APP_CONFIG.profiles.veryLowBuiltUpMax) return 'veryLowBuiltUp'
  if (builtUpPercent < APP_CONFIG.profiles.lowBuiltUpMax) return 'lowBuiltUp'
  if (builtUpPercent < APP_CONFIG.profiles.mediumBuiltUpMax) return 'mediumBuiltUp'
  return 'highBuiltUp'
}

function confidence(
  metrics: BuildingMetrics,
  categories: CategoryResult[],
  rawExplicitAreaM2: number,
  analysisAreaM2: number,
  method: AnalysisResult['boundaryMethod'],
): ConfidenceResult {
  const otherPercent = categories.find((category) => category.key === 'other')?.percent ?? 100
  const explicitLandusePercent = analysisAreaM2 ? Math.min(100, rawExplicitAreaM2 / analysisAreaM2 * 100) : 0
  const unknownBuildingsPercent = metrics.total ? metrics.unknown / metrics.total * 100 : 100
  const buildingCoverageScore = metrics.total === 0 ? 0 : Math.min(35, 10 + Math.log10(metrics.total + 1) * 12)
  const landuseScore = Math.min(35, explicitLandusePercent * 0.42)
  const unknownScore = Math.max(0, 20 - unknownBuildingsPercent * 0.2)
  const boundaryScore = method === 'open-polygon' ? 10 : method === 'dominant-building-cluster' ? 8 : 2
  const score = Math.max(0, Math.min(100, buildingCoverageScore + landuseScore + unknownScore + boundaryScore - Math.max(0, otherPercent - 45) * 0.18))
  const level: ConfidenceLevel = score >= APP_CONFIG.confidence.highScoreMin ? 'high' : score >= APP_CONFIG.confidence.mediumScoreMin ? 'medium' : 'low'
  const reasons: ConfidenceReason[] = [
    { code: 'classifiedBuildings', value: metrics.classifiedPercent },
    { code: 'explicitLanduse', value: explicitLandusePercent },
    { code: 'otherAreas', value: otherPercent },
    { code: 'unknownBuildings', value: unknownBuildingsPercent },
  ]
  return { level, score, reasons, explicitLandusePercent, otherPercent, unknownBuildingsPercent }
}

export function analyzeSettlement(
  settlement: SettlementResult,
  raw: RawGeodata,
  manualBoundary?: PolygonFeature,
): AnalysisResult {
  const warnings: AnalysisWarningCode[] = []
  const boundaryChoice = chooseBoundary(settlement, raw, manualBoundary)
  const boundary = boundaryChoice.boundary
  const analysisAreaM2 = area(boundary)
  const analysisAreaHa = analysisAreaM2 / 10_000

  const buildings = raw.buildings.features.filter((feature) => insideBoundary(feature, boundary))
  const clippedRoads = clipLines(raw.roads, boundary)
  const pois = raw.pois.features.filter((feature) => {
    try { return booleanPointInPolygon(feature as Feature<Point>, boundary) } catch { return false }
  })

  if (buildings.length === 0) warnings.push('noBuildings')
  if (clippedRoads.features.length === 0) warnings.push('noRoads')
  if (typeof raw.queryRadiusM === 'number' && raw.queryRadiusM > 0
    && buildingsReachDataEdge(buildings, settlement.lat, settlement.lon, raw.queryRadiusM)) {
    warnings.push('dataExtentReached')
  }

  const rawByCategory: Partial<Record<Exclude<CategoryKey, 'roads' | 'other'>, PolygonFeature | null>> = {}
  const explicitLanduse = raw.landuse.features.filter((feature) => insideBoundary(feature, boundary) || clipPolygon(feature, boundary))
  let unionCapped = false
  for (const key of ['water', 'industrial', 'residential', 'agricultural', 'green'] as const) {
    const matched = explicitLanduse.filter((feature) => classifyLanduse(feature) === key)
    if (matched.length > APP_CONFIG.analysis.maxUnionFeatures) unionCapped = true
    rawByCategory[key] = safeUnion(matched)
  }

  const explicitResidential = rawByCategory.residential ?? null
  const residentialBuildings = buildings.filter((feature) => {
    const center = featureCenterPoint(feature)
    const insideResidential = Boolean(explicitResidential && center && (() => {
      try { return booleanPointInPolygon(center, explicitResidential) } catch { return false }
    })())
    return classifyBuilding(feature, { insideResidentialLanduse: insideResidential }) === 'residential'
  })
  const industrialBuildings = buildings.filter((feature) => classifyBuilding(feature) === 'industrial')
  if (residentialBuildings.length > APP_CONFIG.analysis.maxBufferedBuildings || industrialBuildings.length > APP_CONFIG.analysis.maxBufferedBuildings) {
    warnings.push('plotBuffersOmitted')
  }
  rawByCategory.residential = safeUnion([
    rawByCategory.residential,
    bufferedBuildings(residentialBuildings, APP_CONFIG.residential.buildingBufferM),
  ])
  rawByCategory.industrial = safeUnion([
    rawByCategory.industrial,
    bufferedBuildings(industrialBuildings, APP_CONFIG.industrial.buildingBufferM),
  ])
  const roadsGeometry = roadArea(clippedRoads)
  const estimatedRoadsM2 = estimatedRoadAreaM2(clippedRoads)
  if (!roadsGeometry && estimatedRoadsM2 > 0) warnings.push('roadAreaEstimated')
  if (unionCapped) warnings.push('areasCapped')

  const geometries: Partial<Record<CategoryKey, PolygonFeature | null>> = { roads: roadsGeometry }
  let occupied: PolygonFeature | null = null
  for (const key of CATEGORY_PRIORITY) {
    const rawGeometry = key === 'roads' ? roadsGeometry : rawByCategory[key]
    const clipped = clipPolygon(rawGeometry ?? null, boundary)
    const exclusive = safeDifference(clipped, occupied)
    geometries[key] = exclusive
    occupied = safeUnion([occupied, exclusive])
  }
  const calculatedOther = safeDifference(boundary, occupied)
  const categoryArea = (key: CategoryKey) => (
    key === 'roads' && !geometries.roads ? estimatedRoadsM2 : safeArea(geometries[key])
  )
  const explicitAreaM2 = CATEGORY_ORDER
    .filter((key) => key !== 'other')
    .reduce((total, key) => total + categoryArea(key), 0)
  const explicitScale = explicitAreaM2 > analysisAreaM2 && explicitAreaM2 > 0
    ? analysisAreaM2 / explicitAreaM2
    : 1
  const otherAreaM2 = Math.max(0, analysisAreaM2 - explicitAreaM2 * explicitScale)
  const calculatedOtherAreaM2 = safeArea(calculatedOther)
  // Turf can fail to subtract very complex city geometries and return the full
  // boundary. Do not draw that misleading fallback over every other layer.
  geometries.other = otherAreaM2 > 1 && calculatedOtherAreaM2 <= otherAreaM2 * 1.05
    ? calculatedOther
    : null

  const categories = CATEGORY_ORDER.map((key): CategoryResult => {
    const geometry = geometries[key] ?? null
    const areaM2 = key === 'other' ? otherAreaM2 : categoryArea(key) * (key === 'roads' && !geometry ? 1 : explicitScale)
    return {
      key,
      label: key,
      color: CATEGORY_META[key].color,
      areaM2,
      areaHa: areaM2 / 10_000,
      percent: analysisAreaM2 ? areaM2 / analysisAreaM2 * 100 : 0,
      geometry,
    }
  })

  const metrics = buildingMetrics(buildings, analysisAreaM2, explicitResidential)
  const roadLengthM = clippedRoads.features.reduce((total, road) => total + safeLength(road), 0)
  const roadMetrics = {
    lengthM: roadLengthM,
    lengthKm: roadLengthM / 1000,
    areaM2: categories.find((category) => category.key === 'roads')?.areaM2 ?? 0,
    densityKmPerKm2: analysisAreaM2 ? (roadLengthM / 1000) / (analysisAreaM2 / 1_000_000) : 0,
  }
  const explicitUnion = safeUnion(explicitLanduse.map((feature) => clipPolygon(feature, boundary)))
  const confidenceResult = confidence(metrics, categories, safeArea(explicitUnion), analysisAreaM2, boundaryChoice.method)
  if (confidenceResult.level === 'high' && warnings.some((warning) => warning === 'roadAreaEstimated' || warning === 'areasCapped' || warning === 'dataExtentReached')) {
    confidenceResult.level = 'medium'
    confidenceResult.score = Math.min(confidenceResult.score, APP_CONFIG.confidence.highScoreMin - 1)
  }

  if (confidenceResult.level === 'low') warnings.push('incompleteData')

  return {
    settlement,
    boundary,
    boundaryMethod: boundaryChoice.method,
    boundaryReason: boundaryChoice.reason,
    categories,
    buildings: featureCollection(buildings),
    roads: clippedRoads,
    pois: featureCollection(pois),
    buildingMetrics: metrics,
    roadMetrics,
    analysisAreaM2,
    analysisAreaHa,
    analysisAreaKm2: analysisAreaM2 / 1_000_000,
    poiCount: pois.length,
    profile: settlementProfile(categories, metrics.builtUpPercent),
    confidence: confidenceResult,
    sourceEndpoint: raw.sourceEndpoint,
    createdAt: new Date().toISOString(),
    warnings,
    dataSource: raw.source ?? 'overpass',
    dataFetchedAt: raw.fetchedAt ?? new Date().toISOString(),
  }
}
