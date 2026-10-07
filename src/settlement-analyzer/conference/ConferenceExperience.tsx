'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Locale } from '@/lib/i18n'
import { href } from '@/lib/paths'
import { SETTLEMENT_ANALYZER_API } from '../api'
import { sa } from '../copy'
import App from '../App'
import type { AnalysisResult } from '../types'
import { RegistrationGate } from './RegistrationGate'
import { trackEvent } from './tracking'
import { useBetaChrome } from '../beta/BetaChrome'

export type BootstrapState = {
  registered: boolean
  ownerMode: boolean
  fullName?: string
  profileCompleted: boolean
  analysisCount: number
  degraded?: boolean
  message?: string
}

const REGISTRATION_FLAG = 'conference_registration_completed'

export default function ConferenceExperience({
  locale,
  ownerMode: serverOwnerMode,
  initial,
  testRegistration = false,
}: {
  locale: Locale
  ownerMode: boolean
  initial: BootstrapState
  testRegistration?: boolean
}) {
  const copy = sa(locale)
  const beta = useBetaChrome(locale, serverOwnerMode, !testRegistration)
  const [state, setState] = useState<BootstrapState>(initial)
  const [ownerDiagnostics, setOwnerDiagnostics] = useState('')

  useEffect(() => {
    let active = true
    const registeredLocally = () => localStorage.getItem(REGISTRATION_FLAG) === '1'
    const load = async () => {
      try {
        const response = await fetch(`${SETTLEMENT_ANALYZER_API}/bootstrap${window.location.search}`, { cache: 'no-store' })
        const result = await response.json() as BootstrapState
        if (!response.ok && !(result.degraded && registeredLocally())) {
          throw new Error(result.message || copy.bootstrapLoadError)
        }
        if (active) setState({
          ...result,
          registered: result.registered || serverOwnerMode || Boolean(result.degraded && registeredLocally()),
        })
      } catch {
        if (!active) return
        if (serverOwnerMode || registeredLocally()) {
          setState({ registered: true, ownerMode: serverOwnerMode, profileCompleted: false, analysisCount: 0, degraded: true })
          if (serverOwnerMode) setOwnerDiagnostics(copy.trackingOffline)
        }
      }
    }
    void load()
    const trackingError = () => {
      if (serverOwnerMode) setOwnerDiagnostics(copy.trackingOffline)
    }
    window.addEventListener('conference-tracking-error', trackingError)
    return () => { active = false; window.removeEventListener('conference-tracking-error', trackingError) }
  }, [copy.bootstrapLoadError, copy.trackingOffline, serverOwnerMode])

  const handleAnalysisStarted = (isSecond: boolean) => {
    void trackEvent(isSecond ? 'second_analysis_started' : 'analysis_started')
  }
  const handleAnalysisCompleted = async (result: AnalysisResult) => {
    try {
      const response = await fetch(`${SETTLEMENT_ANALYZER_API}/analyses`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settlementName: result.settlement.name,
          summary: {
            municipality: result.settlement.municipality,
            region: result.settlement.region,
            areaKm2: Number(result.analysisAreaKm2.toFixed(3)),
            buildings: result.buildingMetrics.total,
            roadLengthKm: Number(result.roadMetrics.lengthKm.toFixed(2)),
            confidence: result.confidence.level,
            profile: result.profile,
          },
        }),
      })
      const payload = await response.json() as { analysisCount?: number }
      if (!response.ok) throw new Error('tracking failed')
      setState((current) => current ? { ...current, analysisCount: payload.analysisCount ?? current.analysisCount + 1 } : current)
    } catch {
      if (serverOwnerMode) setOwnerDiagnostics(copy.analysisUntracked)
      setState((current) => current ? { ...current, analysisCount: current.analysisCount + 1 } : current)
    }
  }

  if (testRegistration) {
    return <RegistrationGate locale={locale} previewMode onCompleted={() => window.location.assign(href(locale, 'settlement-analyzer'))} />
  }

  return (
    <>
      <App
        locale={locale}
        ownerMode={state.ownerMode}
        analysisCount={state.analysisCount}
        onAnalysisStarted={handleAnalysisStarted}
        onAnalysisCompleted={handleAnalysisCompleted}
        onBeforeAnalysis={beta.beforeAnalysis}
        onAnalysisSettled={beta.onSettled}
        feedbackSlot={beta.feedbackSlot}
        onFeatureUsed={(featureName) => void trackEvent('feature_used', { featureName })}
      />
      {beta.dialogs}
      {state.ownerMode && ownerDiagnostics ? (
        <div className="owner-diagnostics" role="status">
          <span>{ownerDiagnostics}</span>
          <button type="button" aria-label={copy.closeMessage} onClick={() => setOwnerDiagnostics('')}><X /></button>
        </div>
      ) : null}
    </>
  )
}
