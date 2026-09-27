'use client';

import { useState } from 'react';
import type { AnalysisRun, EventCampaign, Theme, Participant } from '@/mahni-dosadnoto/types';
import type { WinningThemeContacts } from '@/mahni-dosadnoto/admin/winners';
import type { PublicLiveSnapshot } from '@/mahni-dosadnoto/store/types';
import type { JuryProgress } from '@/mahni-dosadnoto/jury-status';
import { judgeLabel } from '@/mahni-dosadnoto/jury-status';
import {
  mdCloseCollection,
  mdCloseEvent,
  mdCloseVoting,
  mdExportCsv,
  mdOpenVoting,
  mdResetDemo,
  mdRetryJury,
  mdRevealResults,
  mdRunAnalysis,
  mdRunJury,
  mdSeedDemo,
  mdStartCollecting,
  mdStartFinalCountdown,
  mdToggleRecentIdeas,
} from '@/app/admin/(console)/mahni-dosadnoto/actions';

type Props = {
  initial: {
    campaign: EventCampaign;
    counts: { participants: number; ideas: number; votes: number; followups: number };
    participants: Array<Participant & { ideaCount: number; followupCount: number }>;
    themes: Theme[];
    jury: unknown[];
    juryProgress: JuryProgress;
    analysisRuns: AnalysisRun[];
    winningOrganizations: WinningThemeContacts[];
    live: PublicLiveSnapshot;
  };
};

export function MahniAdminDashboard({ initial }: Props) {
  const [busy, setBusy] = useState('');
  const [csv, setCsv] = useState('');
  const campaign = initial.campaign;
  const juryProgress = initial.juryProgress;
  const canRevealResults = juryProgress.complete;
  const juryNeedsRetry = campaign.phase === 'AI_JURY' && !juryProgress.complete;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    try {
      await fn();
      window.location.reload();
    } finally {
      setBusy('');
    }
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">Conference</p>
          <h1>Махни досадното</h1>
          <p>Фаза: <strong>{campaign.phase}</strong></p>
        </div>
      </header>

      <section className="admin-kpis admin-card">
        <p>Участници: {initial.counts.participants}</p>
        <p>Идеи: {initial.counts.ideas}</p>
        <p>Гласове: {initial.counts.votes}</p>
        <p>Follow-up: {initial.counts.followups}</p>
      </section>

      <section className="admin-card">
        <h2>Фази</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('collect', mdStartCollecting)}>Старт събиране</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('close', mdCloseCollection)}>Затвори събиране</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('analysis', mdRunAnalysis)}>Стартирай AI анализ</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('vote', mdOpenVoting)}>Отвори гласуване</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('final', mdStartFinalCountdown)}>Финален отброяване</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('closevote', mdCloseVoting)}>Затвори гласуване</button>
          <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('jury', mdRunJury)}>AI Jury</button>
          {juryNeedsRetry ? (
            <button type="button" className="admin-btn" disabled={!!busy} onClick={() => void run('retry-jury', mdRetryJury)}>Retry failed AI judges</button>
          ) : null}
          <button
            type="button"
            className="admin-btn"
            disabled={!!busy || !canRevealResults}
            title={canRevealResults ? undefined : `${juryProgress.succeeded}/${juryProgress.total} AI judges complete`}
            onClick={() => void run('results', mdRevealResults)}
          >
            Покажи резултат
          </button>
          <button type="button" className="admin-btn secondary" disabled={!!busy} onClick={() => void run('closed', mdCloseEvent)}>Затвори събитие</button>
        </div>
      </section>

      <section className="admin-card">
        <h2>Екран</h2>
        <button type="button" className="admin-btn secondary" onClick={() => void mdToggleRecentIdeas(!campaign.showRecentIdeas)}>Recent ideas: {campaign.showRecentIdeas ? 'ON' : 'OFF'}</button>
        <p><a href="/bg/mahni-dosadnoto/live" target="_blank" rel="noreferrer">Отвори live екран</a></p>
      </section>

      <section className="admin-card">
        <h2>Участници</h2>
        <div className="admin-table-wrap">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Име</th>
                <th>Организация</th>
                <th>Роля</th>
                <th>Имейл</th>
                <th>Телефон</th>
                <th>Съгласие</th>
                <th>Идеи</th>
              </tr>
            </thead>
            <tbody>
              {initial.participants.map((p) => (
                <tr key={p.id}>
                  <td>{p.firstName} {p.lastName}</td>
                  <td>{p.organization}</td>
                  <td>{p.role}</td>
                  <td>{p.email}</td>
                  <td>{p.phone ?? '—'}</td>
                  <td>{p.marketingConsent ? 'Да' : 'Не'}</td>
                  <td>{p.ideaCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card">
        <h2>AI runs</h2>
        <h3>Clustering</h3>
        <ul>
          {initial.analysisRuns.map((run) => (
            <li key={run.id}>
              {run.status} · {run.provider ?? '—'} · {run.model ?? '—'}
              {run.errorCode ? ` · ${run.errorCode}: ${run.errorMessage}` : ''}
            </li>
          ))}
        </ul>
        <h3>Jury</h3>
        <p>
          <strong>{juryProgress.succeeded}/{juryProgress.total}</strong> AI judges complete
          {campaign.phase === 'AI_JURY' && !juryProgress.complete ? ' — finish all three before results' : ''}
        </p>
        <ul>
          {juryProgress.judges.map((j) => (
            <li key={j.judge}>
              {judgeLabel(j.judge)} · {j.status === 'missing' ? 'not started' : j.status}
              {j.errorCode ? ` · ${j.errorCode}${j.errorMessage ? `: ${j.errorMessage}` : ''}` : ''}
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-card">
        <h2>Организации за анализ (Top 3)</h2>
        {initial.winningOrganizations.map((row) => (
          <div key={row.themeId} style={{ marginBottom: '1rem' }}>
            <strong>{row.rank}. {row.themeTitle}</strong>
            <ul>
              {row.organizations.map((org) => (
                <li key={org.organization}>
                  {org.organization}
                  <ul>
                    {org.contacts.map((c) => (
                      <li key={c.email}>{c.name} · {c.email}{c.phone ? ` · ${c.phone}` : ''}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <section className="admin-card">
        <h2>Теми ({initial.themes.length})</h2>
        <ul>{initial.themes.map((t) => <li key={t.id}>{t.isAiWildcard ? '🤖 ' : ''}{t.title} — {t.ideaCount} идеи / {t.organizationCount} орг.</li>)}</ul>
      </section>

      <section className="admin-card">
        <h2>Demo / rehearsal</h2>
        <button type="button" className="admin-btn secondary" disabled={!!busy} onClick={() => void run('seed', mdSeedDemo)}>Seed demo data</button>
        <button type="button" className="admin-btn secondary" disabled={!!busy} onClick={() => void run('reset', mdResetDemo)}>Reset demo only</button>
      </section>

      <section className="admin-card">
        <h2>Export</h2>
        <button type="button" className="admin-btn secondary" onClick={() => void mdExportCsv().then(setCsv)}>Generate CSV</button>
        {csv && <textarea readOnly value={csv} rows={8} style={{ width: '100%', marginTop: '0.75rem' }} />}
      </section>
    </main>
  );
}
