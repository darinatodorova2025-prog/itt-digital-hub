'use client';

import { useEffect, useState } from 'react';
import { IDEA_FREQUENCIES } from '@/mahni-dosadnoto/types';

type Context = {
  phase: string;
  campaignTitle: string;
  participant: { id: string; firstName: string; lastName: string; organization: string } | null;
  ideaCount: number;
  votesUsed: number;
  votesRemaining: number;
  interestThemeIds: string[];
};

type Theme = {
  id: string;
  title: string;
  description: string;
  isAiWildcard: boolean;
  voteCount: number;
};

async function fetchContext(): Promise<Context> {
  const res = await fetch('/api/mahni-dosadnoto/context', { cache: 'no-store' });
  const data = await res.json();
  return {
    phase: data.phase,
    campaignTitle: data.campaignTitle,
    participant: data.participant,
    ideaCount: data.ideaCount,
    votesUsed: data.votesUsed,
    votesRemaining: data.votesRemaining,
    interestThemeIds: data.interestThemeIds,
  };
}

export function MahniParticipantApp() {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [step, setStep] = useState<'register' | 'ideas' | 'wait' | 'vote' | 'results'>('register');
  const [form, setForm] = useState({ firstName: '', lastName: '', organization: '', role: '', email: '', phone: '', marketingConsent: false });
  const [ideaBody, setIdeaBody] = useState('');
  const [frequency, setFrequency] = useState<string>('');
  const [message, setMessage] = useState('');
  const [themes, setThemes] = useState<Theme[]>([]);
  const [liveOverlap, setLiveOverlap] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const next = await fetchContext();
      if (cancelled) return;
      setCtx(next);
      if (!next.participant) setStep('register');
      else if (next.phase === 'COLLECTING') setStep('ideas');
      else if (next.phase === 'VOTING') setStep('vote');
      else if (next.phase === 'RESULTS' || next.phase === 'CLOSED') setStep('results');
      else setStep('wait');
      if (next.phase === 'VOTING' || next.phase === 'RESULTS' || next.phase === 'CLOSED') {
        const live = await fetch('/api/mahni-dosadnoto/live').then((r) => r.json());
        if (!cancelled) {
          setThemes(live.snapshot?.themes ?? []);
          setLiveOverlap(live.snapshot?.overlap ?? null);
        }
      }
    }
    void load();
    const id = setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  async function reload() {
    const next = await fetchContext();
    setCtx(next);
    if (!next.participant) setStep('register');
    else if (next.phase === 'COLLECTING') setStep('ideas');
    else if (next.phase === 'VOTING') setStep('vote');
    else if (next.phase === 'RESULTS' || next.phase === 'CLOSED') setStep('results');
    else setStep('wait');
  }

  async function register() {
    setMessage('');
    const res = await fetch('/api/mahni-dosadnoto/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!data.ok) {
      setMessage('Проверете данните и опитайте отново.');
      return;
    }
    await reload();
  }

  async function submitIdea() {
    setMessage('');
    const res = await fetch('/api/mahni-dosadnoto/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: ideaBody, frequency: frequency || undefined, idempotencyKey: crypto.randomUUID() }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMessage(data.error === 'not_collecting' ? 'Събирането приключи.' : 'Не успяхме да запишем идеята.');
      return;
    }
    setMessage('Идеята е добавена.');
    setIdeaBody('');
    await reload();
  }

  async function vote(themeId: string) {
    const res = await fetch('/api/mahni-dosadnoto/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId, idempotencyKey: crypto.randomUUID() }),
    });
    const data = await res.json();
    if (!data.ok) {
      setMessage('Гласът не беше записан.');
      return;
    }
    await reload();
  }

  async function interest(themeId: string) {
    await fetch('/api/mahni-dosadnoto/interest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    await reload();
  }

  async function followup(themeId: string) {
    await fetch('/api/mahni-dosadnoto/followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId }),
    });
    setMessage('Заявката е записана. Ще се свържем с вас.');
  }

  return (
    <div className="md-app">
      <header className="md-hero">
        <p className="md-eyebrow">ITT Digital Hub · конференция</p>
        <h1>Махни досадното</h1>
        <p className="md-lead">Не търсим къде да сложим ИИ. Търсим къде организацията може да работи по-добре.</p>
      </header>

      {step === 'register' && (
        <section className="md-panel">
          <h2>Регистрация</h2>
          <div className="md-form">
            {(['firstName', 'lastName', 'organization', 'role', 'email'] as const).map((field) => (
              <label key={field}>
                <span>{field === 'firstName' ? 'Име' : field === 'lastName' ? 'Фамилия' : field === 'organization' ? 'Организация' : field === 'role' ? 'Длъжност' : 'Имейл'}</span>
                <input value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} />
              </label>
            ))}
            <label>
              <span>Телефон (по избор)</span>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </label>
            <label className="md-check">
              <input type="checkbox" checked={form.marketingConsent} onChange={(e) => setForm({ ...form, marketingConsent: e.target.checked })} />
              <span>Искам да получа резултатите от инициативата и последващи материали, свързани с идеите от конференцията.</span>
            </label>
            <button type="button" className="md-btn" onClick={() => void register()}>Продължи</button>
          </div>
        </section>
      )}

      {step === 'ideas' && ctx?.participant && (
        <section className="md-panel">
          <h2>Какво ви губи време?</h2>
          <p>Опишете задача, процес или действие, което ви дразни, повтаря се или според вас може да се прави по-лесно.</p>
          <textarea className="md-textarea" value={ideaBody} onChange={(e) => setIdeaBody(e.target.value)} rows={6} placeholder="Всеки месец събираме информация от няколко Excel файла..." />
          <label>
            <span>Колко често срещате този проблем?</span>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="">—</option>
              {IDEA_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </label>
          <button type="button" className="md-btn" onClick={() => void submitIdea()}>Изпрати</button>
          {message && <p className="md-msg">{message}</p>}
          <p className="md-muted">Идеи до момента: {ctx.ideaCount}</p>
          <button type="button" className="md-btn secondary" onClick={() => { setMessage(''); setIdeaBody(''); }}>+ Имам още една</button>
        </section>
      )}

      {step === 'wait' && (
        <section className="md-panel">
          <h2>{ctx?.phase === 'ANALYZING' ? 'Анализираме предложенията...' : 'Очаквайте следващата фаза'}</h2>
          <p>Фаза: {ctx?.phase}</p>
        </section>
      )}

      {step === 'vote' && ctx && (
        <section className="md-panel">
          <h2>Кои проблеми най-много си заслужава да разгледаме по-сериозно?</h2>
          <p className="md-votes-left">{ctx.votesRemaining} оставащи</p>
          <ul className="md-theme-list">
            {themes.map((theme) => (
              <li key={theme.id} className="md-theme-card">
                <h3>{theme.isAiWildcard ? '🤖 ' : ''}{theme.title}</h3>
                <p>{theme.description}</p>
                <div className="md-theme-actions">
                  <button type="button" className="md-btn" disabled={ctx.votesRemaining <= 0} onClick={() => void vote(theme.id)}>Гласувай</button>
                  <button type="button" className="md-btn secondary" onClick={() => void interest(theme.id)} disabled={ctx.interestThemeIds.includes(theme.id)}>
                    {ctx.interestThemeIds.includes(theme.id) ? 'Маркирано' : 'Имаме подобен проблем и при нас'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {step === 'results' && (
        <section className="md-panel">
          <h2>ХОРАТА vs ИИ</h2>
          <p>Официалният резултат е изборът на хората. ИИ е независимо второ мнение.</p>
          {liveOverlap !== null && <p>Съвпадение: {liveOverlap} от 3</p>}
          <ul className="md-theme-list">
            {themes.slice(0, 6).map((theme) => (
              <li key={theme.id} className="md-theme-card">
                <h3>{theme.title}</h3>
                <button type="button" className="md-btn secondary" onClick={() => void followup(theme.id)}>Да, искам да поговорим</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
