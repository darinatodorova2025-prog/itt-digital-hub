export type SourceAvailability = 'active' | 'unavailable' | 'not-available'

export interface SourceRecord {
  id: string
  availability: SourceAvailability
  kind: 'direct' | 'derived' | 'estimated' | 'visual'
}

export function sourceCatalog(terrainActive: boolean, cadastreLoaded: boolean, _dataSource?: 'overpass' | 'pack'): SourceRecord[] {
  return [
    { id: 'ekatte', availability: 'active', kind: 'direct' },
    { id: 'osm', availability: 'active', kind: 'direct' },
    { id: 'terrain', availability: terrainActive ? 'active' : 'unavailable', kind: 'derived' },
    { id: 'cadastre', availability: cadastreLoaded ? 'active' : 'unavailable', kind: 'visual' },
    { id: 'overture', availability: 'not-available', kind: 'direct' },
    { id: 'dynamicWorld', availability: 'not-available', kind: 'derived' },
    { id: 'geofabrik', availability: 'not-available', kind: 'direct' },
    { id: 'population', availability: 'not-available', kind: 'direct' },
  ]
}
