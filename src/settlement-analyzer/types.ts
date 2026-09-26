import type { Feature, FeatureCollection, Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon } from 'geojson'

export type PolygonFeature = Feature<Polygon | MultiPolygon, Record<string, unknown>>
export type LineFeature = Feature<LineString | MultiLineString, Record<string, unknown>>
export type PointFeature = Feature<Point, Record<string, unknown>>

export type CategoryKey = 'water' | 'roads' | 'industrial' | 'residential' | 'agricultural' | 'green' | 'other'

export interface SettlementResult {
  placeId: number
  osmType: 'node' | 'way' | 'relation'
  osmId: number
  lat: number
  lon: number
  displayName: string
  name: string
  municipality: string
  region: string
  country: string
  category: string
  type: string
  boundingBox: [number, number, number, number]
  geojson?: Geometry
  ekatte?: string
}

export interface OsmFeatureProperties {
  id?: string
  type?: string
  tags?: Record<string, string>
  [key: string]: unknown
}

export interface RawGeodata {
  buildings: FeatureCollection<Polygon | MultiPolygon, OsmFeatureProperties>
  roads: FeatureCollection<LineString | MultiLineString, OsmFeatureProperties>
  landuse: FeatureCollection<Polygon | MultiPolygon, OsmFeatureProperties>
  pois: FeatureCollection<Point, OsmFeatureProperties>
  sourceEndpoint: string
  fetchedAt?: string
  source?: 'overpass' | 'pack'
  queryRadiusM?: number
}

export interface CategoryResult {
  key: CategoryKey
  label: string
  color: string
  areaM2: number
  areaHa: number
  percent: number
  geometry: PolygonFeature | null
}

export interface BuildingMetrics {
  total: number
  residential: number
  industrial: number
  other: number
  unknown: number
  footprintM2: number
  builtUpPercent: number
  perHa: number
  residentialPerHa: number
  averageFootprintM2: number
  classifiedPercent: number
}

export interface RoadMetrics {
  lengthM: number
  lengthKm: number
  areaM2: number
  densityKmPerKm2: number
}

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export type SettlementProfileCode =
  | 'agriculturalDominant'
  | 'mixedResidentialIndustrial'
  | 'veryLowBuiltUp'
  | 'lowBuiltUp'
  | 'mediumBuiltUp'
  | 'highBuiltUp'

export type BoundaryReasonCode =
  | 'manual'
  | 'openGeometry'
  | 'residentialLanduse'
  | 'buildingCluster'
  | 'centerBuffer'

export type AnalysisWarningCode = 'noBuildings' | 'noRoads' | 'incompleteData' | 'dataExtentReached' | 'plotBuffersOmitted' | 'roadAreaEstimated' | 'areasCapped'

export type ConfidenceReasonCode =
  | 'classifiedBuildings'
  | 'explicitLanduse'
  | 'otherAreas'
  | 'unknownBuildings'

export interface ConfidenceReason {
  code: ConfidenceReasonCode
  value: number
}

export interface ConfidenceResult {
  level: ConfidenceLevel
  score: number
  reasons: ConfidenceReason[]
  explicitLandusePercent: number
  otherPercent: number
  unknownBuildingsPercent: number
}

export interface AnalysisResult {
  settlement: SettlementResult
  boundary: PolygonFeature
  boundaryMethod: 'open-polygon' | 'dominant-building-cluster' | 'center-buffer'
  boundaryReason: BoundaryReasonCode
  categories: CategoryResult[]
  buildings: FeatureCollection<Polygon | MultiPolygon, OsmFeatureProperties>
  roads: FeatureCollection<LineString | MultiLineString, OsmFeatureProperties>
  pois: FeatureCollection<Point, OsmFeatureProperties>
  buildingMetrics: BuildingMetrics
  roadMetrics: RoadMetrics
  analysisAreaM2: number
  analysisAreaHa: number
  analysisAreaKm2: number
  poiCount: number
  profile: SettlementProfileCode
  confidence: ConfidenceResult
  sourceEndpoint: string
  createdAt: string
  warnings: AnalysisWarningCode[]
  dataSource: 'overpass' | 'pack'
  dataFetchedAt: string
}

export type PackOrigin = 'shipped' | 'local'

export interface PackCatalogItem {
  ekatte: string
  name: string
  municipality: string
  region: string
  type: string
  lat: number
  lon: number
  radiusM: number
  fetchedAt: string
  origin: PackOrigin
}

export interface StoredSettlementPack {
  ekatte: string
  name: string
  municipality: string
  region: string
  type: string
  lat: number
  lon: number
  radiusM: number
  fetchedAt: string
  sourceEndpoint: string
  raw: RawGeodata
}

export type PackDownloadPart = 'landuse' | 'buildings' | 'roads' | 'pois' | 'save'

export interface PackDownloadProgress {
  percent: number
  part: PackDownloadPart
  attempt: number
  status: 'start' | 'retry' | 'done'
}

export type AnalysisStage =
  | 'idle'
  | 'boundary'
  | 'buildings'
  | 'roads'
  | 'landuse'
  | 'geometry'
  | 'metrics'
  | 'map'
  | 'complete'

