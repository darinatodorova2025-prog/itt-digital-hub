"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  formatClock,
  sharedPriorityBody,
  sharedPriorityHeadline,
  storyForPhase,
} from "@/mahni-dosadnoto/presentation";
import { useCountdown } from "@/mahni-dosadnoto/use-countdown";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import { EventLockup } from "@/mahni-dosadnoto/brand";
import { ConvergeIcon } from "@/mahni-dosadnoto/icons";
import { LiveRail } from "@/mahni-dosadnoto/journey";
import { ThemeEquation } from "@/mahni-dosadnoto/grouping";
import { LensBoard } from "@/mahni-dosadnoto/lenses";

/** Stable theme thumbnails for the participant Top 3 result cards. */
const RESULT_THUMBS = ["/event/mahni/thumb-basin.webp", "/event/mahni/thumb-river.webp", "/event/mahni/thumb-aerial.webp"];

export function MahniLiveScreen({ initialSnapshot }: { initialSnapshot: PublicLiveSnapshot | null }) {
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(initialSnapshot);
  const [compact, setCompact] = useState(false);

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

  useEffect(() => {
    const query = window.matchMedia("(max-height: 820px)");
    const apply = () => setCompact(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  // State is genuinely unresolved only when the server could not seed it.
  // Never guess a phase or a photograph: neutral navy branded fallback.
  if (!snapshot) {
    return (
      <div className="md-live md-scene-plain" aria-busy="true">
        <div className="md-live-loading">
          <EventLockup tone="on-dark" height={32} />
          <p className="md-live-loading-text">Зареждаме събитието…</p>
          <span className="md-loading-dot is-on-dark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      </div>
    );
  }

  const quiet = snapshot.phase === "FINALIZING";
  const stage = storyForPhase(snapshot.phase);

  return (
    <div className={`md-live ${sceneClass(snapshot.phase)}`}>
      {quiet ? null : <LiveHeader stage={stage} title={snapshot.title} />}
      <div className="md-live-body">
        {snapshot.phase === "COLLECTING" ? <Collecting snapshot={snapshot} /> : null}
        {snapshot.phase === "ANALYZING" ? <Analyzing snapshot={snapshot} /> : null}
        {snapshot.phase === "VOTING" ? <Voting snapshot={snapshot} limit={compact ? 4 : 5} /> : null}
        {snapshot.phase === "FINALIZING" ? <Countdown snapshot={snapshot} /> : null}
        {snapshot.phase === "AI_JURY" ? <Jury snapshot={snapshot} /> : null}
        {snapshot.phase === "RESULTS" || snapshot.phase === "CLOSED" ? <Results snapshot={snapshot} /> : null}
        {snapshot.phase === "DRAFT" ? <Holding /> : null}
      </div>
    </div>
  );
}

function sceneClass(phase: PublicLiveSnapshot["phase"]): string {
  switch (phase) {
    case "ANALYZING":
      return "md-scene-plain";
    case "VOTING":
      return "md-scene-vote";
    case "RESULTS":
    case "CLOSED":
      return "md-scene-result";
    case "AI_JURY":
      return "md-scene-jury";
    default:
      return "md-scene-night";
  }
}

function LiveHeader({ stage, title = "Махни досадното" }: { stage?: ReturnType<typeof storyForPhase>; title?: string }) {
  return (
    <header className="md-live-top">
      <div className="md-live-brand">
        <EventLockup tone="on-dark" height={32} />
        <p>{title}</p>
      </div>
      {stage ? <LiveRail stage={stage} /> : null}
    </header>
  );
}

function Collecting({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  return (
    <div className="md-live-collect">
      <div>
        <h1 className="md-display">Какво ви губи време?</h1>
        <p className="md-live-lead">Сканирайте и споделете реален проблем от работата си.</p>
        <div className="md-live-metrics">
          <Metric value={snapshot.stats.participants} label="участници" />
          <Metric value={snapshot.stats.organizations} label="организации" />
          <Metric value={snapshot.stats.ideas} label="идеи" />
        </div>
      </div>
      <div className="md-qr">
        <Image src="/event/mahni-dosadnoto-qr.svg" alt="Код за включване в Махни досадното" width={512} height={540} priority unoptimized />
        <p>Сканирайте и участвайте</p>
      </div>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <strong className="md-tick md-display" key={value}>
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

function Analyzing({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const ready = snapshot.groupedThemeCount > 0;
  return (
    <div className="md-live-organize">
      <div>
        <h1 className="md-display">Събираме и подреждаме идеите</h1>
        <p className="md-live-lead">Много отделни наблюдения се превръщат в общи теми.</p>
        <ThemeEquation ideas={snapshot.stats.ideas} themes={snapshot.groupedThemeCount} extra={snapshot.wildcardCount} ready={ready} />
      </div>
      <div className="md-live-group-frame" aria-hidden="true">
        <Image src="/event/mahni/grouping.webp" alt="" fill priority sizes="60vw" className="md-live-group-img" />
      </div>
    </div>
  );
}

function Voting({ snapshot, limit }: { snapshot: PublicLiveSnapshot; limit: number }) {
  const board = [...snapshot.themes]
    .sort((a, b) => b.voteCount - a.voteCount || a.title.localeCompare(b.title, "bg"))
    .slice(0, limit);
  const max = Math.max(1, ...board.map((theme) => theme.voteCount));
  return (
    <div className="md-live-voting">
      <div className="md-live-voting-head">
        <h1 className="md-display">Гласуването е активно</h1>
        <p className="md-live-vote-total">
          <strong className="md-display md-tick" key={snapshot.stats.votes}>
            {snapshot.stats.votes}
          </strong>
          <span>гласа</span>
        </p>
      </div>
      <ol className="md-live-bars">
        {board.map((theme, index) => (
          <li key={theme.id}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span className="md-live-bar-copy">
              <em>{theme.title}</em>
              <span className="md-live-bar-track">
                <i style={{ width: `${Math.max(8, (theme.voteCount / max) * 100)}%` }} />
              </span>
            </span>
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
  const [basis] = useState(() => Math.max(shown, 1));
  const progress = Math.max(0, Math.min(1, shown / basis));
  const radius = 86;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;

  return (
    <div className="md-clock-wrap">
      <EventLockup tone="on-dark" height={30} />
      <h1 className="md-display">{shown <= 30 ? "Последни 30 секунди" : "Последни секунди"}</h1>
      <div className="md-clock-stage">
        <svg className="md-ring" viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={radius} className="md-ring-track" />
          <circle
            cx="100"
            cy="100"
            r={radius}
            className="md-ring-value"
            strokeDasharray={`${dash} ${circumference}`}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <p className="md-clock md-display">{formatClock(shown)}</p>
      </div>
    </div>
  );
}

function Jury({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const lenses = snapshot.juryLenses ?? [];
  const done = lenses.length > 0 && lenses.every((lens) => lens.status === "succeeded");
  return (
    <div className="md-live-jury">
      <h1 className="md-display">{done ? "Вторият поглед е готов." : "Хората вече гласуваха."}</h1>
      <p className="md-live-lead md-display">{done ? "Трите гледни точки са готови." : "Сега ИИ разглежда темите независимо."}</p>
      <LensBoard lenses={snapshot.juryLenses} />
    </div>
  );
}

function Results({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  const aiIds = new Set(snapshot.aiTop3.map((row) => row.id));
  const humanIds = new Set(snapshot.humanTop3.map((row) => row.id));
  const shared = snapshot.humanTop3.filter((row) => aiIds.has(row.id));
  const headline = sharedPriorityHeadline(shared.length);
  const body = sharedPriorityBody(shared.length);
  return (
    <div className="md-live-final">
      <h1 className="md-display">Какво излезе напред</h1>
      <div className="md-live-result">
        <section>
          <h2>Изборът на участниците</h2>
          <ol className="md-live-choice">
            {snapshot.humanTop3.map((row, index) => (
              <li key={row.id} className={aiIds.has(row.id) ? "is-shared" : undefined}>
                <span className="md-live-choice-photo" aria-hidden="true">
                  <Image src={RESULT_THUMBS[index % RESULT_THUMBS.length]!} alt="" fill sizes="9rem" className="md-live-choice-img" />
                </span>
                <b>{String(row.rank).padStart(2, "0")}</b>
                <span className="md-live-choice-copy">
                  {row.title}
                  {aiIds.has(row.id) ? <em className="md-live-shared-badge">Общ приоритет</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="is-secondary">
          <h2>Независим поглед от ИИ</h2>
          <ol className="md-live-choice is-quiet">
            {snapshot.aiTop3.map((row) => (
              <li key={row.id} className={humanIds.has(row.id) ? "is-shared" : undefined}>
                <b>{String(row.rank).padStart(2, "0")}</b>
                <span>{row.title}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      <div className="md-live-close">
        {headline && body ? (
          <div className="md-live-shared">
            <ConvergeIcon size={26} />
            <div>
              <strong className="md-display">{headline}</strong>
              <p>{body}</p>
            </div>
          </div>
        ) : (
          <div />
        )}
        <p className="md-live-official">
          Официалният резултат е изборът на участниците.
          <span>От резултат към действие — организациите зад водещите теми могат да продължат разговора с ITT Digital Hub.</span>
        </p>
      </div>
    </div>
  );
}

function Holding() {
  return (
    <div className="md-live-hold">
      <h1 className="md-display">Махни досадното</h1>
      <p className="md-live-lead">Реални проблеми. Подредени идеи. Практически решения.</p>
      <ol className="md-live-story">
        <li>Споделяме</li>
        <li>Подреждаме</li>
        <li>Избираме</li>
        <li>Втори поглед</li>
        <li>От резултат към действие</li>
      </ol>
    </div>
  );
}
