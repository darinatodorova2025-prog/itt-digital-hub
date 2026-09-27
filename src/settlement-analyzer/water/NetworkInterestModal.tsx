'use client'

import { useState } from 'react'
import type { Locale } from '@/lib/i18n'
import { trackEvent } from '../conference/tracking'
import { waterText } from './copy'

export function NetworkInterestModal({ locale, open, onClose }: { locale: Locale; open: boolean; onClose: () => void }) {
  const copy = waterText(locale)
  const [thanks, setThanks] = useState<'saved' | 'unstored' | null>(null)
  if (!open) return null
  const choose = async (answer: 'yes' | 'no') => {
    const saved = await trackEvent(answer === 'yes' ? 'network_upload_interest_yes' : 'network_upload_interest_no', { context: 'existing-network' })
    setThanks(saved ? 'saved' : 'unstored')
  }
  return (
    <div className="sa-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="sa-modal" role="dialog" aria-modal="true" aria-labelledby="sa-network-title">
        <h2 id="sa-network-title">{copy.modalTitle}</h2>
        <p>{copy.modalBody}</p>
        {thanks ? <p>{thanks === 'saved' ? copy.modalThanks : copy.modalUnstored}</p> : (
          <>
            <p className="sa-modal__question">{copy.modalQuestion}</p>
            <div className="sa-modal__actions">
              <button type="button" className="button button--primary" onClick={() => choose('yes')}>{copy.modalYes}</button>
              <button type="button" className="button" onClick={() => choose('no')}>{copy.modalNo}</button>
            </div>
          </>
        )}
        <button type="button" className="button sa-modal__close" onClick={onClose}>{copy.close}</button>
      </div>
    </div>
  )
}
