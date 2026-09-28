'use client'

import {
  Building2,
  Download,
  Gauge,
  MapPinned,
  Pencil,
  Route,
  Save,
  SquareDashed,
  Warehouse,
  X,
} from 'lucide-react'
import { formatAreaHa, formatAreaM2, formatDate, formatNumber, formatPercent } from '../lib/format'
import type { AnalysisResult } from '../types'
import { DonutChart } from './DonutChart'
import type { Locale } from '@/lib/i18n'
import { sa } from '../copy'
import { presentBoundaryReason, presentConfidenceLevel, presentConfidenceReason, presentWarning } from '../present'
import { EngineeringSummary } from '../water/EngineeringSummary'
import type { TerrainSummary } from '../water/metrics'
import type { WaterContext } from '../water/modes'
import { sourceCatalog } from '../water/sources'
import { waterText } from '../water/copy'

interface Props {
  locale: Locale
  mode: WaterContext
  result: AnalysisResult
  terrain: TerrainSummary | null
  terrainState: 'idle' | 'loading' | 'active' | 'unavailable'
  editing: boolean
  cadastreLoaded?: boolean
  onOpenNetwork: () => void
  onStartEditing: () => void
  onCancelEditing: () => void
  onRecalculate: () => void
  onExportCsv: () => void
  onExportGeoJson: () => void
}

export function ResultsPanel({ locale, mode, result, terrain, terrainState, editing, cadastreLoaded = false, onOpenNetwork, onStartEditing, onCancelEditing, onRecalculate, onExportCsv, onExportGeoJson }: Props) {
  const copy = sa(locale)
  const water = waterText(locale)
  const totalPercent = result.categories.reduce((total, category) => total + category.percent, 0)
  const confidenceClass = result.confidence.level
  const dataSourceLine = (result.dataSource === 'pack' ? copy.sourcePack : copy.sourceOverpass).replace('{date}', formatDate(result.dataFetchedAt, locale))
  const boundaryLine = copy.sourceBoundary.replace('{method}', presentBoundaryReason(locale, result.boundaryReason))
  const sources = sourceCatalog(terrain?.status === 'active', cadastreLoaded, result.dataSource)
  const availabilityLabel = { active: water.active, unavailable: water.unavailable, 'not-available': water.planned }
  return (
    <aside className="results-panel" aria-label={copy.results}>
      <div className="results-scroll">
        <header className="results-header">
          <h2>{result.settlement.name.trim()}{result.settlement.region ? `, ${result.settlement.region.trim()}` : ''}</h2>
          <EngineeringSummary locale={locale} mode={mode} result={result} terrain={terrain} terrainState={terrainState} />
          <details className="confidence-details">
            <summary>{copy.confidenceLabel}: <strong className={`confidence confidence--${confidenceClass}`}>{presentConfidenceLevel(locale, result.confidence.level)}</strong></summary>
            <ul>{result.confidence.reasons.map((reason) => <li key={reason.code}>{presentConfidenceReason(locale, reason)}</li>)}</ul>
            <p><strong>{copy.boundaryMethod}:</strong> {presentBoundaryReason(locale, result.boundaryReason)}</p>
          </details>
          <button type="button" className="button network-interest" onClick={onOpenNetwork}>{water.uploadAction}</button>
        </header>

        {result.warnings.length > 0 && <div className="warning-box">{result.warnings.map((warning) => <p key={warning}>{presentWarning(locale, warning)}</p>)}</div>}

        <section className="result-section">
          <details>
            <summary>{water.landCover}</summary>
          <div className="distribution-grid">
            <div className="table-wrap">
              <table>
                <thead><tr><th>{copy.category}</th><th>{copy.areaM2}</th><th>{copy.areaHa}</th><th>%</th></tr></thead>
                <tbody>
                  {result.categories.map((category) => (
                    <tr key={category.key}>
                      <td><span className="table-swatch" style={{ background: category.color }} />{copy.categories[category.key]}</td>
                      <td>{formatNumber(category.areaM2, 0, locale)}</td>
                      <td>{formatNumber(category.areaHa, 1, locale)}</td>
                      <td>{formatNumber(category.percent, 1, locale)}%</td>
                    </tr>
                  ))}
                  <tr className="total-row"><td>{copy.total}</td><td>{formatNumber(result.analysisAreaM2, 0, locale)}</td><td>{formatNumber(result.analysisAreaHa, 1, locale)}</td><td>{formatNumber(totalPercent, 1, locale)}%</td></tr>
                </tbody>
              </table>
            </div>
            <DonutChart locale={locale} categories={result.categories} />
          </div>
          </details>
        </section>

        <section className="result-section compact-details">
          <details>
            <summary>{copy.kpis}</summary>
            <div className="kpi-grid">
              <Kpi icon={<SquareDashed />} label={copy.analysedArea} value={formatAreaHa(result.analysisAreaHa, locale)} secondary={`${formatNumber(result.analysisAreaKm2, 1, locale)} ${copy.km2}`} />
              <Kpi icon={<Route />} label={copy.roadNetwork} value={`${formatNumber(result.roadMetrics.lengthKm, result.roadMetrics.lengthKm >= 10 ? 0 : 1, locale)} ${copy.km}`} secondary={`${formatNumber(result.roadMetrics.densityKmPerKm2, 1, locale)} ${copy.kmPerKm2}`} />
              <Kpi icon={<Building2 />} label={copy.buildings} value={formatNumber(result.buildingMetrics.total, 0, locale)} secondary={`${formatNumber(result.buildingMetrics.perHa, 1, locale)} ${copy.perHa}`} />
              <Kpi icon={<Warehouse />} label={copy.buildingFootprint} value={formatAreaM2(result.buildingMetrics.footprintM2, locale)} secondary={`${copy.builtUp} ${formatPercent(result.buildingMetrics.builtUpPercent, locale)}`} />
              <Kpi icon={<Gauge />} label={copy.averageBuilding} value={formatAreaM2(result.buildingMetrics.averageFootprintM2, locale)} secondary={`${formatNumber(result.buildingMetrics.residential, 0, locale)} ${copy.likelyResidential}`} />
              <Kpi icon={<MapPinned />} label={copy.pois} value={formatNumber(result.poiCount, 0, locale)} secondary={`${formatNumber(result.buildingMetrics.unknown, 0, locale)} ${copy.unknownBuildings}`} />
            </div>
          </details>
        </section>

        <section className="result-section compact-details">
          <details>
            <summary>{copy.details}</summary>
            <dl>
              <div><dt>{copy.likelyResidential}</dt><dd>{formatNumber(result.buildingMetrics.residential, 0, locale)}</dd></div>
              <div><dt>{copy.categories.industrial}</dt><dd>{formatNumber(result.buildingMetrics.industrial, 0, locale)}</dd></div>
              <div><dt>{copy.categories.other}</dt><dd>{formatNumber(result.buildingMetrics.other, 0, locale)}</dd></div>
              <div><dt>{copy.unknownBuildings}</dt><dd>{formatNumber(result.buildingMetrics.unknown, 0, locale)}</dd></div>
              <div><dt>{copy.likelyResidential} {copy.perHa}</dt><dd>{formatNumber(result.buildingMetrics.residentialPerHa, 2, locale)}</dd></div>
              <div><dt>{copy.roadNetwork}</dt><dd>{formatAreaM2(result.roadMetrics.areaM2, locale)}</dd></div>
            </dl>
          </details>
        </section>

        <section className="result-section compact-details">
          <details>
            <summary>{water.sources}</summary>
            <ul className="source-list">
              {sources.map((source) => (
                <li key={source.id}>
                  <strong>{water.sourceNames[source.id as keyof typeof water.sourceNames]}</strong>
                  <span className={`source-state source-state--${source.availability}`}>{availabilityLabel[source.availability]}</span>
                  <small>{water.sourceRoles[source.id as keyof typeof water.sourceRoles]} {water.kinds[source.kind]}</small>
                  {source.id === 'osm' ? <small>{dataSourceLine}. {boundaryLine}</small> : null}
                  {source.id === 'terrain' && terrain?.status === 'active' ? <small>{terrain.resolutionM} m · {terrain.fetchedAt ? formatDate(terrain.fetchedAt, locale) : ''}</small> : null}
                </li>
              ))}
              <li>{copy.sourceRegistry}</li>
            </ul>
          </details>
        </section>
      </div>

      <footer className="results-actions">
        {editing ? (
          <>
            <button type="button" className="button button--primary" onClick={onRecalculate}><Save size={17} /> {copy.recalculate}</button>
            <button type="button" className="button" onClick={onCancelEditing}><X size={17} /> {copy.cancel}</button>
          </>
        ) : (
          <button type="button" className="button" onClick={onStartEditing}><Pencil size={17} /> {copy.editBoundary}</button>
        )}
        <button type="button" className="button" onClick={onExportCsv} disabled={editing}><Download size={17} /> {copy.downloadCsv}</button>
        <button type="button" className="button" onClick={onExportGeoJson} disabled={editing}><Download size={17} /> {copy.downloadGeoJson}</button>
      </footer>
    </aside>
  )
}

function Kpi({ icon, label, value, secondary }: { icon: React.ReactNode; label: string; value: string; secondary: string }) {
  return <div className="kpi"><span className="kpi__icon">{icon}</span><span><small>{label}</small><strong>{value}</strong><em>{secondary}</em></span></div>
}
