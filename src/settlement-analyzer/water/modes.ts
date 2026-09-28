import type { LayerVisibility } from '../components/layer-visibility'

export type WaterContext = 'supply' | 'wastewater' | 'stormwater' | 'extension'

export const WATER_CONTEXTS: WaterContext[] = ['supply', 'wastewater', 'stormwater', 'extension']

export function layersForMode(mode: WaterContext): LayerVisibility {
  const shared: LayerVisibility = {
    boundary: true,
    residential: true,
    industrial: false,
    roads: true,
    green: false,
    water: false,
    agricultural: false,
    other: false,
    buildings: true,
    pois: false,
    cadastre: false,
    terrain: true,
  }
  if (mode === 'stormwater') return { ...shared, industrial: true, water: true }
  if (mode === 'extension') return { ...shared, residential: true, buildings: true, roads: true }
  return shared
}

export function terrainStyle(mode: WaterContext): 'elevation' | 'slope' {
  return mode === 'wastewater' || mode === 'stormwater' ? 'slope' : 'elevation'
}
