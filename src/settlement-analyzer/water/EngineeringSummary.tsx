'use client'

import type { Locale } from '@/lib/i18n'
import { formatNumber } from '../lib/format'
import type { AnalysisResult } from '../types'
import { componentCount, type TerrainSummary } from './metrics'
import type { WaterContext } from './modes'
import { compassLabel, waterText } from './copy'

export function EngineeringSummary({
  locale, mode, result, terrain, terrainState,
}: {
  locale: Locale
  mode: WaterContext
  result: AnalysisResult
  terrain: TerrainSummary | null
  terrainState: 'idle' | 'loading' | 'active' | 'unavailable'
}) {
  const copy = waterText(locale)
  const unit = locale === 'en' ? 'm' : 'м'
  const residential = result.categories.find((category) => category.key === 'residential')
  const industrial = result.categories.find((category) => category.key === 'industrial')
  const roads = result.categories.find((category) => category.key === 'roads')
  const perKm2 = result.analysisAreaKm2 > 0 ? Math.round(result.buildingMetrics.total / result.analysisAreaKm2) : 0
  const builtHa = (residential?.areaHa ?? 0) + (mode === 'stormwater' ? (industrial?.areaHa ?? 0) + (roads?.areaHa ?? 0) : 0)
  const zoneLabel = { low: copy.lowZone, mid: copy.midZone, high: copy.highZone }
  const direction = compassLabel(locale, terrain?.downhillBearingDeg ?? null)
  return (
    <section className="engineering" aria-label={copy.modes[mode]}>
      <p className="engineering__lead">{copy.lead[mode]}</p>
      <div className="engineering__kpis">
        <Kpi label={copy.buildings} value={formatNumber(result.buildingMetrics.total, 0, locale)} />
        <Kpi label={copy.components} value={formatNumber(componentCount(residential?.geometry), 0, locale)} />
        <Kpi label={copy.residentialArea} value={`${formatNumber(mode === 'stormwater' ? builtHa : residential?.areaHa ?? 0, 1, locale)} ${locale === 'en' ? 'ha' : 'ха'}`} />
        <Kpi label={copy.streets} value={`${formatNumber(result.roadMetrics.lengthKm, result.roadMetrics.lengthKm >= 10 ? 0 : 1, locale)} ${locale === 'en' ? 'km' : 'км'}`} />
        <Kpi label={copy.density} value={formatNumber(perKm2, 0, locale)} />
        <Kpi label={copy.elevation} value={terrain?.status === 'active' && terrain.minM != null && terrain.maxM != null ? `${terrain.minM}–${terrain.maxM} ${unit}` : terrainState === 'loading' ? '…' : '—'} />
        <Kpi label={copy.elevationDiff} value={terrain?.status === 'active' && terrain.differenceM != null ? `${terrain.differenceM} ${unit}` : '—'} />
        {(mode === 'wastewater' || mode === 'stormwater') && (
          <Kpi label={copy.slope} value={terrain?.typicalSlopePercent != null ? `${formatNumber(terrain.typicalSlopePercent, 1, locale)}%` : '—'} />
        )}
      </div>
      {terrain?.status === 'active' ? (
        <p className="engineering__terrain">
          {terrain.zones.map((zone) => `${zoneLabel[zone.key]} ${zone.sharePercent}%`).join(' · ')}
          {direction ? `. ${copy.downhill} ${direction}.` : '.'} {copy.terrainDisclaimer}
        </p>
      ) : <p className="engineering__terrain">{terrainState === 'loading' ? copy.terrainLoading : copy.terrainUnavailable}</p>}
    </section>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="engineering__kpi"><small>{label}</small><strong>{value}</strong></div>
}
