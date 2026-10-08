"use client";

import { useEffect, useRef, useState } from "react";
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
import { AudienceReviewCard } from "@/mahni-dosadnoto/CombiningReview";
import { ResultCredits } from "@/mahni-dosadnoto/ResultCredits";
import { toPublicReviewCard, type LiveReviewItem } from "@/mahni-dosadnoto/review";
import { REVIEW_PREVIEW_ITEMS, REVIEW_PREVIEW_KEY } from "@/mahni-dosadnoto/review-preview";
import { mdApproveAudienceTheme, mdCloseVoting, mdOpenVoting, mdSplitAudienceTheme } from "@/app/admin/(console)/mahni-dosadnoto/actions";

export function MahniLiveScreen({
  initialSnapshot,
  preview = false,
  operator = false,
}: {
  initialSnapshot: PublicLiveSnapshot | null;
  preview?: boolean;
  operator?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(initialSnapshot);
  const [compact, setCompact] = useState(false);
  const [previewItems, setPreviewItems] = useState<LiveReviewItem[]>(REVIEW_PREVIEW_ITEMS);
  const pausePoll = useRef(false);

  useEffect(() => {
    if (!preview) return;
    const timer = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(REVIEW_PREVIEW_KEY);
        if (!saved) return;
        const parsed = JSON.parse(saved) as LiveReviewItem[];
        if (Array.isArray(parsed) && parsed.length > 0) setPreviewItems(parsed);
      } catch {
        // Keep the built-in preview ideas.
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [preview]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (pausePoll.current) return;
      try {
        const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && !pausePoll.current) setSnapshot(data.snapshot ?? null);
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
  const paused = snapshot.paused === true;
  const stage = storyForPhase(snapshot.phase);
  const realReview = snapshot.phase === "ANALYZING" ? snapshot.review : null;
  const previewCard = preview && !realReview ? toPublicReviewCard({
    id: previewItems[0]?.id ?? "preview",
    title: previewItems[0]?.title ?? "",
    description: previewItems[0]?.description ?? "",
    ideaCount: previewItems[0]?.sources.length ?? 0,
    organizationCount: 0,
    sourceIdeas: previewItems[0]?.sources ?? [],
  }) : null;
  const card = realReview ?? previewCard;
  const showReview = card !== null;
  const finalThemes = snapshot.themes.filter((theme) => !theme.isAiWildcard);
  const showFinals = !preview && snapshot.phase === "ANALYZING" && !realReview && finalThemes.length > 0;

  return (
    <div className={`md-live ${sceneClass(showReview || showFinals ? "ANALYZING" : snapshot.phase)}`}>
      {quiet && !showReview && !showFinals ? null : <LiveHeader stage={stage} />}
      <div className={(showReview || showFinals) && !paused ? "md-live-body is-review" : "md-live-body"}>
        {paused ? <PauseHold /> : null}
        {paused ? null : showFinals ? (
          <FinalThemes
            themes={finalThemes}
            operator={operator}
            onBusy={(busy) => {
              pausePoll.current = busy;
            }}
            onDone={async () => {
              const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
              const data = await res.json();
              setSnapshot(data.snapshot ?? null);
            }}
          />
        ) : null}
        {paused || showFinals ? null : showReview && card ? (
          <>
            <AudienceReviewCard card={card} notice={realReview ? undefined : "Локален преглед. Живото събитие не се променя."} />
            {operator && realReview ? (
              <HallReviewControls
                themeId={card.id}
                canSplit={card.ideaCount > 1}
                onBusy={(busy) => {
                  pausePoll.current = busy;
                }}
                onDone={async () => {
                  const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
                  const data = await res.json();
                  setSnapshot(data.snapshot ?? null);
                }}
              />
            ) : null}
          </>
        ) : null}
        {paused || showReview ? null : snapshot.phase === "COLLECTING" ? <Collecting snapshot={snapshot} /> : null}
        {paused || showReview || showFinals ? null : snapshot.phase === "ANALYZING" ? <Analyzing snapshot={snapshot} /> : null}
        {paused || showReview ? null : snapshot.phase === "VOTING" ? (
          <Voting
            snapshot={snapshot}
            limit={compact ? 4 : 5}
            operator={operator}
            onBusy={(busy) => {
              pausePoll.current = busy;
            }}
            onDone={async () => {
              const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
              const data = await res.json();
              setSnapshot(data.snapshot ?? null);
            }}
          />
        ) : null}
        {paused || showReview ? null : snapshot.phase === "FINALIZING" ? (
          <Countdown
            snapshot={snapshot}
            operator={operator}
            onBusy={(busy) => {
              pausePoll.current = busy;
            }}
            onDone={async () => {
              const res = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
              const data = await res.json();
              setSnapshot(data.snapshot ?? null);
            }}
          />
        ) : null}
        {paused || showReview ? null : snapshot.phase === "AI_JURY" || snapshot.phase === "RESULTS" || snapshot.phase === "CLOSED" ? <Results snapshot={snapshot} /> : null}
        {paused || showReview ? null : snapshot.phase === "DRAFT" ? <Holding /> : null}
      </div>
    </div>
  );
}

function FinalThemes({
  themes,
  operator,
  onBusy,
  onDone,
}: {
  themes: PublicLiveSnapshot["themes"];
  operator: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setError("");
    setPending(true);
    onBusy(true);
    try {
      await mdOpenVoting();
      await onDone();
    } catch {
      setError("Гласуването не беше пуснато.");
    } finally {
      onBusy(false);
      setPending(false);
    }
  }

  return (
    <section className="md-audience md-final-themes" aria-label="Крайни теми">
      <h2>Крайни теми</h2>
      <ol>
        {themes.map((theme, index) => (
          <li key={theme.id}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span>{theme.title}</span>
          </li>
        ))}
      </ol>
      {operator ? (
        <div className="md-audience-actions">
          <button type="button" className="md-ops-btn" disabled={pending} aria-busy={pending} onClick={() => void start()}>
            {pending ? <span className="md-ops-spin" aria-hidden="true" /> : null}
            ОДОБРЕНО ОТ ЗАЛАТА
          </button>
          {error ? <p className="md-audience-error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function HallReviewControls({
  themeId,
  canSplit,
  onBusy,
  onDone,
}: {
  themeId: string;
  canSplit: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => Promise<void>;
}) {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function run(id: "approve" | "split") {
    setError("");
    setPending(id);
    onBusy(true);
    try {
      if (id === "approve") await mdApproveAudienceTheme(themeId);
      else await mdSplitAudienceTheme(themeId);
      await onDone();
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        code === "already_single"
          ? "Тази тема вече е една идея и не може да се раздели."
          : code === "split_failed"
            ? "Разделянето не завърши. Темата остава за нов опит."
            : "Решението не беше записано.",
      );
    } finally {
      onBusy(false);
      setPending("");
    }
  }

  return (
    <div className="md-audience-actions">
      <button type="button" className="md-ops-btn" disabled={pending.length > 0} aria-busy={pending === "approve"} onClick={() => void run("approve")}>
        {pending === "approve" ? <span className="md-ops-spin" aria-hidden="true" /> : null}
        ОДОБРЕНО ОТ ЗАЛАТА
      </button>
      {canSplit ? (
        <button type="button" className="md-ops-btn" disabled={pending.length > 0} aria-busy={pending === "split"} onClick={() => void run("split")}>
          {pending === "split" ? <span className="md-ops-spin" aria-hidden="true" /> : null}
          ТРЯБВА ДА СЕ РАЗДЕЛИ
        </button>
      ) : null}
      {error ? <p className="md-audience-error">{error}</p> : null}
    </div>
  );
}

function sceneClass(phase: PublicLiveSnapshot["phase"]): string {
  switch (phase) {
    case "ANALYZING":
      return "md-scene-organize";
    case "VOTING":
      return "md-scene-vote";
    case "RESULTS":
    case "CLOSED":
    case "AI_JURY":
      return "md-scene-result";
    case "DRAFT":
      return "md-scene-hold";
    case "COLLECTING":
      return "md-scene-collect";
    default:
      return "md-scene-night";
  }
}

function LiveHeader({ stage }: { stage?: ReturnType<typeof storyForPhase> }) {
  return (
    <header className="md-live-top">
      <div className="md-live-brand">
        <EventLockup tone="on-dark" height={36} />
      </div>
      {stage ? <LiveRail stage={stage} /> : null}
    </header>
  );
}

function Collecting({ snapshot }: { snapshot: PublicLiveSnapshot }) {
  return (
    <div className="md-live-collect">
      <div>
        <h1 className="md-display">
          Какво ви губи
          <br />
          време?
        </h1>
        <p className="md-live-lead">
          Споделете нещо от ежедневната работа, което ви бави.
          <br />
          После заедно ще изберем кое си струва да решим.
        </p>
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
    </div>
  );
}

function ResultButton({
  onBusy,
  onDone,
}: {
  onBusy: (busy: boolean) => void;
  onDone: () => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function show() {
    setError("");
    setPending(true);
    onBusy(true);
    try {
      await mdCloseVoting();
      await onDone();
    } catch {
      setError("Резултатът не беше показан.");
    } finally {
      onBusy(false);
      setPending(false);
    }
  }

  return (
    <div className="md-audience-actions">
      <button type="button" className="md-ops-btn" disabled={pending} aria-busy={pending} onClick={() => void show()}>
        {pending ? <span className="md-ops-spin" aria-hidden="true" /> : null}
        Резултат
      </button>
      {error ? <p className="md-audience-error">{error}</p> : null}
    </div>
  );
}

function Voting({
  snapshot,
  limit,
  operator,
  onBusy,
  onDone,
}: {
  snapshot: PublicLiveSnapshot;
  limit: number;
  operator: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => Promise<void>;
}) {
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
      {operator ? <ResultButton onBusy={onBusy} onDone={onDone} /> : null}
    </div>
  );
}

function Countdown({
  snapshot,
  operator,
  onBusy,
  onDone,
}: {
  snapshot: PublicLiveSnapshot;
  operator: boolean;
  onBusy: (busy: boolean) => void;
  onDone: () => Promise<void>;
}) {
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
      {operator ? <ResultButton onBusy={onBusy} onDone={onDone} /> : null}
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
          <ol className="md-live-choice">
            {snapshot.humanTop3.map((row) => (
              <li key={row.id} className={aiIds.has(row.id) ? "is-shared" : undefined}>
                <b>{String(row.rank).padStart(2, "0")}</b>
                <div className="md-live-choice-copy">
                  <span>{row.title}</span>
                  {aiIds.has(row.id) ? <em className="md-live-shared-badge">Общ приоритет</em> : null}
                  <ResultCredits organizations={row.organizations} />
                </div>
              </li>
            ))}
          </ol>
        </section>
        {snapshot.aiTop3.length > 0 ? (
          <section className="is-secondary">
            <ol className="md-live-choice is-quiet">
              {snapshot.aiTop3.map((row) => (
                <li key={row.id} className={humanIds.has(row.id) ? "is-shared" : undefined}>
                  <b>{String(row.rank).padStart(2, "0")}</b>
                  <span>{row.title}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
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

function PauseHold() {
  return (
    <div className="md-live-hold is-pause">
      <h1 className="md-display">Пауза</h1>
      <p className="md-live-lead">
        Спираме за момент.
        <br />
        След малко ще продължим.
      </p>
    </div>
  );
}

function Holding() {
  return (
    <div className="md-live-hold">
      <h1 className="md-display">
        Какво ви губи
        <br />
        време?
      </h1>
      <p className="md-live-lead">
        Споделете нещо от ежедневната работа, което ви бави.
        <br />
        После заедно ще изберем кое си струва да решим.
      </p>
      <p className="md-live-soon">Започваме след малко</p>
      <div className="md-hold-qr">
        <Image src="/event/mahni-dosadnoto-qr.svg" alt="Код за включване в Махни досадното" width={512} height={540} priority unoptimized />
        <p>Сканирайте и участвайте</p>
      </div>
    </div>
  );
}
