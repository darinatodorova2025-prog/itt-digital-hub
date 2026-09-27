import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { TRACKED_EVENT_NAMES } from '../conference/constants'
import { elevationGrid, summarizeTerrain } from './metrics'
import { layersForMode } from './modes'
import { sourceCatalog } from './sources'

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? filesUnder(path) : [path]
  })
}

describe('предпроектен ВиК анализ', () => {
  it('няма файлов вход в анализатора', () => {
    const root = join(process.cwd(), 'src/settlement-analyzer')
    const api = join(process.cwd(), 'src/app/api/settlement-analyzer')
    const sources = [...filesUnder(root), ...filesUnder(api)].filter((path) => (path.endsWith('.ts') || path.endsWith('.tsx')) && !path.endsWith('.test.ts'))
    const combined = sources.map((path) => readFileSync(path, 'utf8')).join('\n')
    expect(combined).not.toContain('type="file"')
    expect(combined).not.toContain('showOpenFilePicker')
  })

  it('записва анонимния интерес към съществуваща мрежа', () => {
    expect(TRACKED_EVENT_NAMES).toEqual(expect.arrayContaining([
      'network_upload_modal_open',
      'network_upload_interest_yes',
      'network_upload_interest_no',
    ]))
  })

  it('сменя акцента на слоевете според вида анализ', () => {
    expect(layersForMode('stormwater').water).toBe(true)
    expect(layersForMode('stormwater').industrial).toBe(true)
    expect(layersForMode('supply').water).toBe(false)
    expect(layersForMode('extension').roads).toBe(true)
  })

  it('смята денивелация от Copernicus извадка и не измисля релеф при малко точки', () => {
    const grid = elevationGrid(25, 42, 25.02, 42.02, 16)
    expect(grid.length).toBeGreaterThan(3)
    expect(grid.length).toBeLessThanOrEqual(16)
    const summary = summarizeTerrain([
      { lat: 42, lon: 25, elevationM: 180, dLat: 0.01, dLon: 0.01 },
      { lat: 42.01, lon: 25, elevationM: 190, dLat: 0.01, dLon: 0.01 },
      { lat: 42, lon: 25.01, elevationM: 200, dLat: 0.01, dLon: 0.01 },
      { lat: 42.01, lon: 25.01, elevationM: 240, dLat: 0.01, dLon: 0.01 },
    ], '2026-09-27T00:00:00.000Z')
    expect(summary.status).toBe('active')
    expect(summary.differenceM).toBe(60)
    expect(summary.minM).toBe(180)
    expect(summary.maxM).toBe(240)
    expect(summary.resolutionM).toBe(90)
    expect(summarizeTerrain([{ lat: 42, lon: 25, elevationM: 10 }], null).status).toBe('unavailable')
  })

  it('не представя липсващи източници като активни', () => {
    const inactive = sourceCatalog(true, false).filter((source) => source.id === 'overture' || source.id === 'dynamicWorld' || source.id === 'population')
    expect(inactive.every((source) => source.availability === 'not-available')).toBe(true)
    expect(sourceCatalog(true, false).find((source) => source.id === 'terrain')?.availability).toBe('active')
    expect(sourceCatalog(false, true).find((source) => source.id === 'cadastre')?.kind).toBe('visual')
  })
})
