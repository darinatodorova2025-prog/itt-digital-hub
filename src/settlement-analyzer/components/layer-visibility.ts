export interface LayerVisibility {
  boundary: boolean
  residential: boolean
  industrial: boolean
  roads: boolean
  green: boolean
  water: boolean
  agricultural: boolean
  other: boolean
  buildings: boolean
  pois: boolean
  cadastre: boolean
  terrain: boolean
}

export function createDefaultLayerVisibility(): LayerVisibility {
  return {
    boundary: true,
    residential: true,
    industrial: true,
    roads: true,
    green: true,
    water: true,
    agricultural: true,
    other: true,
    buildings: true,
    pois: true,
    cadastre: false,
    terrain: true,
  }
}
