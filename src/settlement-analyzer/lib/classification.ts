import type { Feature, MultiPolygon, Polygon } from 'geojson'
import type { OsmFeatureProperties } from '../types'

export type BuildingClass = 'residential' | 'industrial' | 'other' | 'unknown'

const residentialBuildings = new Set(['house', 'detached', 'residential', 'semidetached_house', 'bungalow', 'terrace', 'apartments', 'dwelling'])
const industrialBuildings = new Set(['warehouse', 'industrial', 'factory', 'commercial', 'retail', 'manufacture'])
const otherBuildings = new Set(['school', 'church', 'chapel', 'garage', 'garages', 'shed', 'barn', 'public', 'civic', 'hospital', 'kindergarten'])

export function tagsOf(feature: Feature<GeoJSON.Geometry, OsmFeatureProperties | Record<string, unknown>>) {
  const properties = feature.properties ?? {}
  return (properties.tags as Record<string, string> | undefined) ?? properties as Record<string, string>
}

export function classifyBuilding(
  feature: Feature<Polygon | MultiPolygon, OsmFeatureProperties>,
  context?: { insideResidentialLanduse?: boolean },
): BuildingClass {
  const tags = tagsOf(feature)
  const building = tags.building || tags['building:use'] || ''
  if (residentialBuildings.has(building)) return 'residential'
  if (building === 'yes' && context?.insideResidentialLanduse) return 'residential'
  if (industrialBuildings.has(building) || ['industrial', 'commercial', 'retail'].includes(tags.landuse ?? '')) return 'industrial'
  if (otherBuildings.has(building) || Boolean(tags.amenity)) return 'other'
  return 'unknown'
}

export type RawLandCategory = 'water' | 'industrial' | 'residential' | 'agricultural' | 'green' | null

const greenLanduse = new Set(['grass', 'meadow', 'forest', 'village_green', 'recreation_ground'])
const agriculturalLanduse = new Set(['farmland', 'orchard', 'vineyard', 'farmyard', 'plant_nursery', 'greenhouse_horticulture'])

export function classifyLanduse(feature: Feature<Polygon | MultiPolygon, OsmFeatureProperties>): RawLandCategory {
  const tags = tagsOf(feature)
  if (tags.natural === 'water' || tags.water || ['riverbank', 'dock', 'canal'].includes(tags.waterway ?? '')) return 'water'
  if (['industrial', 'commercial', 'retail'].includes(tags.landuse ?? '')) return 'industrial'
  if (tags.landuse === 'residential') return 'residential'
  if (agriculturalLanduse.has(tags.landuse ?? '')) return 'agricultural'
  if (greenLanduse.has(tags.landuse ?? '') || ['wood', 'scrub', 'grassland', 'wetland'].includes(tags.natural ?? '') || ['park', 'recreation_ground', 'garden', 'nature_reserve'].includes(tags.leisure ?? '')) return 'green'
  return null
}

