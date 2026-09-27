"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Mark } from "@/components/layout/Logo";
import { formatClock, overlapHeadline } from "@/mahni-dosadnoto/presentation";
import { useCountdown } from "@/mahni-dosadnoto/use-countdown";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";

export function MahniLiveScreen() {
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled) setSnapshot(data.snapshot ?? null);
      } catch {
        if (!cancelled) setSnapshot((current) => current);
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!snapshot) {
    return (
      <div className="md-live" aria-busy="true">
        <Brand />
      </div>
    );
  }

  return (
    <div className="md-live">
      {snapshot.phase === "FINALIZING" ? null : <Brand event={snapshot.title} />}
      <div className="md-live-body">
        {snapshot.phase === "COLLECTING" ? <Collecting snapshot={snapshot} /> : null}
        {snapshot.phase === "ANALYZING" ? <Analyzing snapshot={snapshot} /> : null}
        {snapshot.phase === "VOTING" ? <Voting snapshot={snapshot} /> : null}
        {snapshot.phase === "FINALIZING" ? <Countdown snapshot={snapshot} /> : null}
        {snapshot.phase === "AI_JURY" ? <Jury snapshot={snapshot} /> : null}
        {snapshot.phase === "RESULTS" || snapshot.phase === "CLOSED" ? <Results snapshot={snapshot} /> : null}
        {snapshot.phase === "DRAFT" ? <Holding /> : null}
      </div>
    </div>
  );
}

function Brand({ event = "Махни досадното" }: { event?: string }) {
  return (
    <div className="md-live-brandrow">
      <p className="md-live-brand">
        <Mark size={28} tone="on-dark" />
        ITT Digital Hub
      </p>
      <p className="md-live-event">{event}</p>
    </div>
  );
}

function Collecting({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const ideas = snapshot.showRecentIdeas ? snapshot.recentIdeas.slice(0, 4) : [];
  return (
    <div className="md-live-collect">
      <div>
        <h1 className="md-display">Какво ви губи време?</h1>
        <div className="md-live-metrics">
          <div>
            <strong>{snapshot.stats.participants}</strong>
            <span>Участници</span>
          </div>
          <div>
            <strong>{snapshot.stats.organizations}</strong>
            <span>Организации</span>
          </div>
          <div>
            <strong>{snapshot.stats.ideas}</strong>
            <span>Идеи</span>
          </div>
        </div>
        {ideas.length > 0 ? (
          <ul className="md-live-ideas">
            {ideas.map((idea, index) => (
              <li key={`${idea.createdAt}-${index}`}>{idea.body}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="md-qr">
        <Image src="/event/mahni-dosadnoto-qr.svg" alt="Код за включване в Махни досадното" width={512} height={540} priority unoptimized />
        <p>Включете се</p>
      </div>
    </div>
  );
}

function Analyzing({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const ready = snapshot.groupedThemeCount > 0;
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (ready) return;
    const id = window.setInterval(() => setStage((current) => Math.min(2, current + 1)), 4500);
    return () => window.clearInterval(id);
  }, [ready]);

  const steps = [
    `${snapshot.stats.ideas} оригинални идеи`,
    "Откриваме сходни проблеми",
    "Групираме общите теми",
  ];
  const active = ready ? 3 : stage;

  return (
    <div>
      <h1 className="md-display">{ready ? `${snapshot.groupedThemeCount} основни теми` : steps[active] ?? steps[0]}</h1>
      {ready ? <p className="md-live-result-count">+ {snapshot.wildcardCount} допълнителна тема</p> : null}
      <ol className="md-live-stages">
        {steps.map((step, index) => (
          <li key={step} className={ready || index < active ? "is-done" : index === active ? "is-active" : undefined}>
            {step}
          </li>
        ))}
        <li className={ready ? "is-active" : undefined}>
          {ready
            ? `${snapshot.groupedThemeCount} основни теми`
            : "Основните теми"}
        </li>
      </ol>
    </div>
  );
}

function Voting({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const board = [...snapshot.themes].sort((a, b) => b.voteCount - a.voteCount || a.title.localeCompare(b.title, "bg")).slice(0, 5);
  return (
    <div>
      <h1 className="md-display">Гласуването е активно</h1>
      <p className="md-live-sub">
        {snapshot.stats.participants} участници · {snapshot.stats.votes} гласа
      </p>
      <ol className="md-live-rank">
        {board.map((theme, index) => (
          <li key={theme.id}>
            <b>{index + 1}</b>
            <span>{theme.title}</span>
            <strong>{theme.voteCount}</strong>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Countdown({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const seconds = useCountdown(snapshot.countdownSeconds, true);
  const shown = seconds ?? snapshot.countdownSeconds ?? 0;
  return (
    <div className="md-clock-wrap">
      <p className="md-live-brand md-live-brand-center">
        <Mark size={28} tone="on-dark" />
        ITT Digital Hub
      </p>
      <h1 className="md-display">Последни {shown} секунди</h1>
      <p className="md-clock md-display">{formatClock(shown)}</p>
      <p className="md-clock-note">Гласуването приключва</p>
    </div>
  );
}

function Jury({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const ready = snapshot.juryReady ?? 0;
  const total = snapshot.juryTotal ?? 3;
  return (
    <div>
      <h1 className="md-display">Хората вече гласуваха.</h1>
      <p className="md-live-lead md-display">Сега ИИ дава независимо второ мнение.</p>
      <p className="md-live-result-count">
        {ready} от {total} гледни точки готови
      </p>
    </div>
  );
}

function Results({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const aiIds = new Set(snapshot.aiTop3.map((row) => row.id));
  const humanIds = new Set(snapshot.humanTop3.map((row) => row.id));
  return (
    <div className="md-live-final">
      <h1 className="md-display">ХОРАТА vs ИИ</h1>
      <div className="md-live-columns">
        <section>
          <h2>Изборът на хората</h2>
          <ol className="md-live-choice">
            {snapshot.humanTop3.map((row) => (
              <li key={row.id} className={aiIds.has(row.id) ? "is-match" : undefined}>
                <b>{row.rank}</b>
                <span>
                  {row.title}
                  {aiIds.has(row.id) ? <em className="md-match">Съвпадение</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <p className="md-live-vs">срещу</p>
        <section>
          <h2>Изборът на ИИ</h2>
          <ol className="md-live-choice">
            {snapshot.aiTop3.map((row) => (
              <li key={row.id} className={humanIds.has(row.id) ? "is-match" : undefined}>
                <b>{row.rank}</b>
                <span>
                  {row.title}
                  {humanIds.has(row.id) ? <em className="md-match">Съвпадение</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="md-live-close">
        <div>
          <strong className="md-display">{overlapHeadline(snapshot.overlap)}</strong>
          <p>Официалният резултат е изборът на хората.</p>
        </div>
      </div>
    </div>
  );
}

function Holding() {
  return (
    <div>
      <h1 className="md-display">Махни досадното</h1>
      <p className="md-live-sub">Събитието започва скоро.</p>
    </div>
  );
}
