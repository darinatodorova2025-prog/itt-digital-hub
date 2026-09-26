import { polygon } from '@turf/turf'
import { describe, expect, it } from 'vitest'
import { classifyBuilding, classifyLanduse } from './classification'
import type { OsmFeatureProperties } from '../types'
import type { Feature, Polygon } from 'geojson'

function tagged(tags: Record<string, string>): Feature<Polygon, OsmFeatureProperties> {
  return polygon([[[25, 42], [25.001, 42], [25.001, 42.001], [25, 42.001], [25, 42]]], { tags }) as Feature<Polygon, OsmFeatureProperties>
}

describe('класификация на сгради', () => {
  it('не приема building=yes за жилищна сграда без жилищен контекст', () => {
    expect(classifyBuilding(tagged({ building: 'yes' }))).toBe('unknown')
    expect(classifyBuilding(tagged({ building: 'yes' }), { insideResidentialLanduse: true })).toBe('residential')
  })

  it('разделя жилищни, индустриални и други известни сгради', () => {
    expect(classifyBuilding(tagged({ building: 'house' }))).toBe('residential')
    expect(classifyBuilding(tagged({ building: 'warehouse' }))).toBe('industrial')
    expect(classifyBuilding(tagged({ building: 'school' }))).toBe('other')
  })
})

describe('класификация на територии', () => {
  it('държи земеделските площи отделно от зелените', () => {
    expect(classifyLanduse(tagged({ landuse: 'farmland' }))).toBe('agricultural')
    expect(classifyLanduse(tagged({ natural: 'wood' }))).toBe('green')
  })

  it('разпознава водни и индустриални площи', () => {
    expect(classifyLanduse(tagged({ natural: 'water' }))).toBe('water')
    expect(classifyLanduse(tagged({ landuse: 'industrial' }))).toBe('industrial')
  })
})
