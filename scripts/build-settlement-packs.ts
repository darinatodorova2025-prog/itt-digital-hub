import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { bbox } from '@turf/turf'
import { PACK_EKATTE } from './settlement-pack-list'
import registryJson from '../src/settlement-analyzer/data/settlements.json'
import type { RawGeodata } from '../src/settlement-analyzer/types'

interface RegistryRow {
  ekatte: string
  name: string
  type: 'city' | 'town' | 'village' | 'hamlet'
  municipality: string
  region: string
  lat: number
  lon: number
}

globalThis.sessionStorage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
  clear() {},
  key: () => null,
  length: 0,
} as unknown as Storage

const OUT_DIR = path.resolve('public/settlement-packs')
const registry = registryJson as RegistryRow[]

function roundNumbers(_key: string, value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 1_000_000) / 1_000_000 : value
}

async function attachTerrain(row: RegistryRow, raw: RawGeodata) {
  if (raw.terrainSamples && raw.terrainSamples.length >= 4 && raw.terrainSourceName) return raw
  const { analyzeSettlement } = await import('../src/settlement-analyzer/services/analysis')
  const { readElevationGrid } = await import('../src/settlement-analyzer/water/elevation-source')
  const settlement = {
    placeId: Number(row.ekatte),
    osmType: 'node' as const,
    osmId: 0,
    lat: row.lat,
    lon: row.lon,
    displayName: row.name,
    name: row.name,
    municipality: row.municipality,
    region: row.region,
    country: 'България',
    category: 'place',
    type: row.type,
    boundingBox: [row.lat - 0.05, row.lat + 0.05, row.lon - 0.05, row.lon + 0.05] as [number, number, number, number],
    ekatte: row.ekatte,
  }
  const analysis = analyzeSettlement(settlement, raw)
  const [west, south, east, north] = bbox(analysis.boundary)
  const read = await readElevationGrid(west, south, east, north)
  if (!read) {
    console.warn(`Terrain unavailable for ${row.name}`)
    return raw
  }
  raw.terrainSamples = read.samples
  raw.terrainSourceName = read.sourceName
  raw.terrainResolutionM = read.resolutionM
  return raw
}

async function writeManifest() {
  const files = (await readdir(OUT_DIR)).filter((file) => file.endsWith('.json') && file !== 'manifest.json')
  const packs = []
  for (const file of files) {
    const ekatte = file.replace(/\.json$/, '')
    const row = registry.find((item) => item.ekatte === ekatte)
    const payload = JSON.parse(await readFile(path.join(OUT_DIR, file), 'utf8')) as {
      name?: string
      radiusM?: number
      fetchedAt?: string
    }
    if (!row) continue
    packs.push({
      ekatte,
      name: row.name,
      municipality: row.municipality,
      region: row.region,
      type: row.type,
      lat: row.lat,
      lon: row.lon,
      radiusM: payload.radiusM ?? 0,
      fetchedAt: payload.fetchedAt ?? '',
    })
  }
  packs.sort((a, b) => a.name.localeCompare(b.name, 'bg'))
  await writeFile(path.join(OUT_DIR, 'manifest.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), packs }, null, 2)}\n`)
  console.log(`Wrote manifest with ${packs.length} pack(s)`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })
  const failed: string[] = []

  for (const [index, ekatte] of PACK_EKATTE.entries()) {
    const row = registry.find((item) => item.ekatte === ekatte)
    if (!row) {
      console.error(`Missing registry row for ${ekatte}`)
      failed.push(ekatte)
      continue
    }
    const file = path.join(OUT_DIR, `${ekatte}.json`)
    let existing: { raw: RawGeodata; radiusM: number; fetchedAt: string; sourceEndpoint?: string } | null = null
    try {
      existing = JSON.parse(await readFile(file, 'utf8')) as { raw: RawGeodata; radiusM: number; fetchedAt: string; sourceEndpoint?: string }
    } catch {
      existing = null
    }
    if (existing?.raw) {
      if (existing.raw.terrainSamples && existing.raw.terrainSamples.length >= 4) {
        console.log(`Skip complete pack ${row.name} (${ekatte})`)
        continue
      }
      console.log(`Adding terrain to ${row.name}`)
      existing.raw = await attachTerrain(row, existing.raw)
      const body = JSON.stringify({ ...existing, ekatte, name: row.name }, roundNumbers)
      await writeFile(file, body)
      console.log(`${row.name} terrain updated`)
      continue
    }
    try {
      const { analysisRadiusForSettlement } = await import('../src/settlement-analyzer/services/analysis')
      const { downloadPackGeodata } = await import('../src/settlement-analyzer/services/overpass')
      const radiusM = analysisRadiusForSettlement({ type: row.type })
      console.log(`Downloading ${row.name} (${ekatte}) radius ${radiusM}`)
      const raw = await downloadPackGeodata(row.lat, row.lon, radiusM, (progress) => {
        if (progress.status === 'start') console.log(`  ${row.name}: ${progress.part}`)
      })
      raw.source = 'pack'
      await attachTerrain(row, raw)
      const payload = {
        ekatte,
        name: row.name,
        radiusM,
        fetchedAt: raw.fetchedAt ?? new Date().toISOString(),
        sourceEndpoint: raw.sourceEndpoint,
        raw,
      }
      const body = JSON.stringify(payload, roundNumbers)
      await writeFile(file, body)
      console.log(`${row.name} (${ekatte}): ${(Buffer.byteLength(body) / 1_048_576).toFixed(2)} MB`)
    } catch (error) {
      failed.push(ekatte)
      console.error(`Failed ${ekatte}:`, error)
    }
    if (index < PACK_EKATTE.length - 1) await new Promise((resolve) => setTimeout(resolve, 8000))
  }

  await writeManifest()
  if (failed.length > 0) {
    console.error(`Failed packs: ${failed.join(', ')}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
