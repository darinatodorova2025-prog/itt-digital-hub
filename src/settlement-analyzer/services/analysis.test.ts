import { featureCollection, lineString, point, polygon } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { analysisRadiusForSettlement, analyzeSettlement, packRadiusForSettlement } from './analysis'
import type { OsmFeatureProperties, PolygonFeature, RawGeodata, SettlementResult } from '../types'
import type { Feature, LineString, Point, Polygon } from 'geojson'

const boundary = polygon([[[25, 42], [25.012, 42], [25.012, 42.012], [25, 42.012], [25, 42]]]) as PolygonFeature
const settlement: SettlementResult = {
  placeId: 1, osmType: 'node', osmId: 1, lat: 42.006, lon: 25.006,
  displayName: 'Тестово, България', name: 'Тестово', municipality: 'Тестова', region: 'Тестова', country: 'България',
  category: 'place', type: 'village', boundingBox: [41.9, 42.1, 24.9, 25.1],
}

function land(tags: Record<string, string>, coordinates: number[][]): Feature<Polygon, OsmFeatureProperties> {
  return polygon([[...coordinates, coordinates[0]]], { tags }) as Feature<Polygon, OsmFeatureProperties>
}

function fixture(withData = true): RawGeodata {
  const buildings = withData ? [
    land({ building: 'house' }, [[25.002, 42.002], [25.0024, 42.002], [25.0024, 42.0024], [25.002, 42.0024]]),
    land({ building: 'yes' }, [[25.004, 42.004], [25.0044, 42.004], [25.0044, 42.0044], [25.004, 42.0044]]),
    land({ building: 'warehouse' }, [[25.008, 42.008], [25.0086, 42.008], [25.0086, 42.0086], [25.008, 42.0086]]),
  ] : []
  const landuse = withData ? [
    land({ landuse: 'residential' }, [[25.001, 42.001], [25.007, 42.001], [25.007, 42.007], [25.001, 42.007]]),
    land({ landuse: 'farmland' }, [[25.006, 42.006], [25.011, 42.006], [25.011, 42.011], [25.006, 42.011]]),
    land({ natural: 'water' }, [[25.005, 42.005], [25.008, 42.005], [25.008, 42.008], [25.005, 42.008]]),
  ] : []
  const roads = withData ? [lineString([[24.999, 42.006], [25.013, 42.006]], { tags: { highway: 'residential' } }) as Feature<LineString, OsmFeatureProperties>] : []
  const pois = withData ? [point([25.003, 42.003], { tags: { amenity: 'school' } }) as Feature<Point, OsmFeatureProperties>] : []
  return {
    buildings: featureCollection(buildings), roads: featureCollection(roads), landuse: featureCollection(landuse), pois: featureCollection(pois), sourceEndpoint: 'https://example.test',
  }
}

describe('анализ на населено място', () => {
  it('използва по-голям радиус за градове, без да разширява селата', () => {
    expect(analysisRadiusForSettlement({ type: 'city' })).toBe(6000)
    expect(analysisRadiusForSettlement({ type: 'town' })).toBe(4400)
    expect(analysisRadiusForSettlement({ type: 'village' })).toBe(2800)
    expect(packRadiusForSettlement({ type: 'city' })).toBe(12_000)
    expect(packRadiusForSettlement({ type: 'town' })).toBe(7000)
    expect(packRadiusForSettlement({ type: 'village' })).toBe(2800)
  })

  it('премахва overlaps и седемте категории дават 100%', () => {
    const result = analyzeSettlement(settlement, fixture(), boundary)
    expect(result.categories).toHaveLength(7)
    expect(result.categories.reduce((sum, category) => sum + category.percent, 0)).toBeCloseTo(100, 5)
    expect(result.categories.find((category) => category.key === 'water')!.areaM2).toBeGreaterThan(0)
    expect(result.buildingMetrics.total).toBe(3)
    expect(result.buildingMetrics.residential).toBe(2)
    expect(result.buildingMetrics.unknown).toBe(0)
    expect(result.roadMetrics.lengthKm).toBeGreaterThan(0)
    expect(result.poiCount).toBe(1)
  })

  it('остава работоспособен при липса на сгради, улици и land-use', () => {
    const result = analyzeSettlement(settlement, fixture(false), boundary)
    expect(result.categories.find((category) => category.key === 'other')!.percent).toBeCloseTo(100, 5)
    expect(result.buildingMetrics.total).toBe(0)
    expect(result.roadMetrics.lengthM).toBe(0)
    expect(result.confidence.level).toBe('low')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('използва близката жилищна зона, когато сградните данни са недостатъчни', () => {
    const raw = fixture(false)
    raw.landuse = featureCollection([
      land({ landuse: 'residential' }, [[24.998, 41.998], [25.018, 41.998], [25.018, 42.018], [24.998, 42.018]]),
    ])
    const result = analyzeSettlement(settlement, raw)
    expect(result.boundaryMethod).toBe('open-polygon')
    expect(result.boundaryReason).toBe('residentialLanduse')
    expect(result.analysisAreaHa).toBeGreaterThan(200)
  })

  it('включва свързани градски квартали, но не и отдалечено населено място', () => {
    const city = { ...settlement, type: 'city' }
    const raw = fixture(false)
    raw.landuse = featureCollection([
      land({ landuse: 'residential' }, [[24.995, 41.998], [25.008, 41.998], [25.008, 42.010], [24.995, 42.010]]),
      land({ landuse: 'residential' }, [[25.012, 41.998], [25.025, 41.998], [25.025, 42.010], [25.012, 42.010]]),
      land({ landuse: 'residential' }, [[25.045, 41.998], [25.055, 41.998], [25.055, 42.010], [25.045, 42.010]]),
    ])
    const result = analyzeSettlement(city, raw)
    expect(result.analysisAreaKm2).toBeGreaterThan(3)
    expect(result.analysisAreaKm2).toBeLessThan(8)
  })

  it('завършва за град с много сгради без да блокира', () => {
    const city = { ...settlement, type: 'city' }
    const buildings = Array.from({ length: 520 }, (_, index) => {
      const lon = 25.002 + (index % 26) * 0.00025
      const lat = 42.002 + Math.floor(index / 26) * 0.00025
      const d = 0.00005
      return land({ building: 'house' }, [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d]])
    })
    const roads = Array.from({ length: 80 }, (_, index) => (
      lineString([[25, 42 + index * 0.00008], [25.012, 42 + index * 0.00008]], { tags: { highway: 'residential' } })
    ))
    const raw = fixture(false)
    raw.buildings = featureCollection(buildings)
    raw.roads = featureCollection(roads)
    raw.landuse = featureCollection([
      land({ landuse: 'residential' }, [[24.998, 41.998], [25.02, 41.998], [25.02, 42.018], [24.998, 42.018]]),
    ])
    const started = Date.now()
    const result = analyzeSettlement(city, raw)
    expect(Date.now() - started).toBeLessThan(4000)
    expect(result.buildingMetrics.total).toBeGreaterThan(100)
    expect(result.categories.reduce((sum, category) => sum + category.percent, 0)).toBeCloseTo(100, 4)
  })

  it('за град с много сгради предпочита застроената зона пред малка жилищна OSM зона', () => {
    const city = { ...settlement, type: 'city' as const }
    const buildings = Array.from({ length: 1850 }, (_, index) => {
      const lon = 24.995 + (index % 43) * 0.00048
      const lat = 41.995 + Math.floor(index / 43) * 0.00038
      const d = 0.00004
      return land({ building: 'house' }, [[lon, lat], [lon + d, lat], [lon + d, lat + d], [lon, lat + d]])
    })
    const raw = fixture(false)
    raw.buildings = featureCollection(buildings)
    raw.landuse = featureCollection([
      land({ landuse: 'residential' }, [[25.008, 42.008], [25.011, 42.008], [25.011, 42.011], [25.008, 42.011]]),
    ])
    const result = analyzeSettlement(city, raw)
    expect(result.boundaryReason).toBe('buildingCluster')
    expect(result.analysisAreaHa).toBeGreaterThan(80)
    expect(result.buildingMetrics.total).toBeGreaterThan(800)
    expect(result.categories.reduce((sum, category) => sum + category.percent, 0)).toBeCloseTo(100, 4)
  })

  it('предупреждава, когато застройката опира края на свалените данни', () => {
    const city = { ...settlement, type: 'city' as const }
    const buildings = []
    for (let step = 0; step < 55; step += 1) {
      const lon = 25.006 + step * 0.0015
      buildings.push(land({ building: 'house' }, [[lon, 42.006], [lon + 0.0002, 42.006], [lon + 0.0002, 42.0062], [lon, 42.0062]]))
      buildings.push(land({ building: 'house' }, [[lon, 42.0064], [lon + 0.0002, 42.0064], [lon + 0.0002, 42.0066], [lon, 42.0066]]))
      buildings.push(land({ building: 'house' }, [[lon + 0.0003, 42.006], [lon + 0.0005, 42.006], [lon + 0.0005, 42.0062], [lon + 0.0003, 42.0062]]))
    }
    const raw = fixture(false)
    raw.buildings = featureCollection(buildings)
    raw.queryRadiusM = 6000
    const result = analyzeSettlement(city, raw)
    expect(result.warnings).toContain('dataExtentReached')
  })
})
