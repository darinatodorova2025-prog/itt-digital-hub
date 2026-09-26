'use client';

import { useEffect, useState } from 'react';
import type { PublicLiveSnapshot } from '@/mahni-dosadnoto/store/types';

export function MahniLiveScreen() {
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch('/api/mahni-dosadnoto/live', { cache: 'no-store' });
      const data = await res.json();
      if (!cancelled) setSnapshot(data.snapshot ?? null);
    }
    void load();
    const id = setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (!snapshot) return <div className="md-live md-live--loading">Зареждане...</div>;

  return (
    <div className="md-live">
      <header>
        <p>ITT Digital Hub</p>
        <h1>{snapshot.title}</h1>
      </header>

      {snapshot.phase === 'COLLECTING' && (
        <section>
          <div className="md-live-stats">
            <div><strong>{snapshot.stats.participants}</strong><span>участници</span></div>
            <div><strong>{snapshot.stats.organizations}</strong><span>организации</span></div>
            <div><strong>{snapshot.stats.ideas}</strong><span>идеи</span></div>
          </div>
          {snapshot.showRecentIdeas && (
            <ul className="md-live-ideas">
              {snapshot.recentIdeas.map((idea, idx) => (
                <li key={`${idea.createdAt}-${idx}`}>{idea.body}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {snapshot.phase === 'ANALYZING' && (
        <section className="md-live-stage">
          <h2>Събрахме вашите идеи.</h2>
          <h2>Анализираме предложенията...</h2>
          <p>{snapshot.stats.ideas} оригинални идеи</p>
          <p>{snapshot.analysisStage ?? 'Откриваме сходни проблеми'}</p>
        </section>
      )}

      {(snapshot.phase === 'VOTING' || snapshot.phase === 'FINALIZING') && (
        <section>
          <h2>{snapshot.phase === 'FINALIZING' ? `Последни ${snapshot.countdownSeconds ?? 30} секунди` : 'Гласуването е активно'}</h2>
          <p>{snapshot.stats.participants} участници · {snapshot.stats.votes} гласа</p>
          {snapshot.phase !== 'FINALIZING' && (
            <ol className="md-live-rank">
              {[...snapshot.themes].sort((a, b) => b.voteCount - a.voteCount).slice(0, 5).map((t, idx) => (
                <li key={t.id}>{idx + 1}. {t.title} — {t.voteCount}</li>
              ))}
            </ol>
          )}
        </section>
      )}

      {(snapshot.phase === 'RESULTS' || snapshot.phase === 'CLOSED') && (
        <section className="md-live-final">
          <h2>ХОРАТА vs ИИ</h2>
          <div className="md-live-columns">
            <div>
              <h3>👥 Изборът на хората</h3>
              <ol>{snapshot.humanTop3.map((r) => <li key={r.rank}>{r.rank}. {r.title}</li>)}</ol>
            </div>
            <div>
              <h3>🤖 Изборът на ИИ</h3>
              <ol>{snapshot.aiTop3.map((r) => <li key={r.rank}>{r.rank}. {r.title}</li>)}</ol>
            </div>
          </div>
          <p>{snapshot.overlap === 3 ? 'Хората и ИИ са единодушни' : `Съвпадение: ${snapshot.overlap ?? 0} от 3`}</p>
          <p className="md-live-note">Официален резултат: изборът на хората.</p>
        </section>
      )}
    </div>
  );
}
