"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { IDEA_FREQUENCIES } from "@/mahni-dosadnoto/types";
import {
  formatClock,
  sharedPriorityBody,
  sharedPriorityHeadline,
  storyForPhase,
  votesRemainingLabel,
  type StoryStage,
} from "@/mahni-dosadnoto/presentation";
import { useCountdown } from "@/mahni-dosadnoto/use-countdown";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import type { ParticipantInitialContext } from "@/mahni-dosadnoto/server/initial-state";
import { EventLockup } from "@/mahni-dosadnoto/brand";
import { CheckIcon, ConvergeIcon, PlaneIcon, StageGlyph } from "@/mahni-dosadnoto/icons";
import { ParticipantStage, StageProgress } from "@/mahni-dosadnoto/journey";
import { GroupingDiagram, ThemeEquation } from "@/mahni-dosadnoto/grouping";
import { LensBoard } from "@/mahni-dosadnoto/lenses";

type Context = ParticipantInitialContext;

type View = "register" | "ideas" | "analyzing" | "vote" | "finalizing" | "jury" | "results" | "waiting";

const THUMBS = ["/event/mahni/thumb-basin.webp", "/event/mahni/thumb-river.webp", "/event/mahni/thumb-aerial.webp"];

async function fetchContext(): Promise<Context> {
  const res = await fetch("/api/mahni-dosadnoto/context", { cache: "no-store" });
  if (!res.ok) throw new Error("context");
  const data = await res.json();
  return {
    phase: data.phase,
    campaignTitle: data.campaignTitle,
    participant: data.participant,
    ideaCount: data.ideaCount ?? 0,
    votesUsed: data.votesUsed ?? 0,
    votesRemaining: data.votesRemaining ?? 3,
    votedThemeIds: data.votedThemeIds ?? [],
    interestThemeIds: data.interestThemeIds ?? [],
    followupThemeIds: data.followupThemeIds ?? [],
  };
}

function viewFor(ctx: Context): View {
  if (!ctx.participant) return "register";
  switch (ctx.phase) {
    case "COLLECTING":
      return "ideas";
    case "ANALYZING":
      return "analyzing";
    case "VOTING":
      return "vote";
    case "FINALIZING":
      return "finalizing";
    case "AI_JURY":
      return "jury";
    case "RESULTS":
    case "CLOSED":
      return "results";
    default:
      return "waiting";
  }
}

export function MahniParticipantApp({
  initialContext,
  initialSnapshot,
}: {
  initialContext: Context | null;
  initialSnapshot: PublicLiveSnapshot | null;
}) {
  const [ctx, setCtx] = useState<Context | null>(initialContext);
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(initialSnapshot);
  const [entered, setEntered] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    organization: "",
    role: "",
    email: "",
    phone: "",
    marketingConsent: false,
  });
  const [ideaBody, setIdeaBody] = useState("");
  const [frequency, setFrequency] = useState("");
  const [justSent, setJustSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const formId = useId();
  const focusIdea = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await fetchContext();
        const liveRes = await fetch("/api/mahni-dosadnoto/live", { cache: "no-store" });
        const live = await liveRes.json();
        if (cancelled) return;
        setCtx(next);
        setSnapshot(live.snapshot ?? null);
        setError("");
      } catch {
        if (!cancelled) setError("Връзката прекъсна. Опитваме отново.");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const view = ctx ? viewFor(ctx) : "register";
  const countdown = useCountdown(snapshot?.countdownSeconds ?? null, view === "finalizing");
  const stage = ctx ? storyForPhase(ctx.phase) : null;

  useEffect(() => {
    if (view !== "ideas" || justSent || !focusIdea.current) return;
    focusIdea.current = false;
    document.getElementById(formId)?.focus();
  }, [view, justSent, formId]);

  async function reload() {
    const next = await fetchContext();
    setCtx(next);
  }

  async function register() {
    setError("");
    setPending("register");
    try {
      const res = await fetch("/api/mahni-dosadnoto/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.ok) {
        setError("Проверете данните и опитайте отново.");
        return;
      }
      await reload();
    } finally {
      setPending("");
    }
  }

  async function submitIdea() {
    setError("");
    setPending("idea");
    try {
      const res = await fetch("/api/mahni-dosadnoto/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: ideaBody,
          frequency: frequency || undefined,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error === "not_collecting" ? "Събирането приключи." : "Не успяхме да запишем идеята.");
        return;
      }
      setIdeaBody("");
      setFrequency("");
      setJustSent(true);
      setMessage("");
      await reload();
    } finally {
      setPending("");
    }
  }

  async function vote(themeId: string) {
    if (!ctx || ctx.votedThemeIds.includes(themeId) || ctx.votesRemaining <= 0) return;
    setError("");
    setPending(themeId);
    try {
      const res = await fetch("/api/mahni-dosadnoto/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId, idempotencyKey: crypto.randomUUID() }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError("Гласът не беше записан.");
        return;
      }
      await reload();
    } finally {
      setPending("");
    }
  }

  async function interest(themeId: string) {
    if (ctx?.interestThemeIds.includes(themeId)) return;
    setPending(`interest-${themeId}`);
    try {
      await fetch("/api/mahni-dosadnoto/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      await reload();
    } finally {
      setPending("");
    }
  }

  async function followup(themeId: string, title: string) {
    if (ctx?.followupThemeIds.includes(themeId)) return;
    setPending(`follow-${themeId}`);
    try {
      const res = await fetch("/api/mahni-dosadnoto/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themeId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError("Заявката не беше записана.");
        return;
      }
      setMessage(`Записахме, че искате разговор по „${title}“.`);
      await reload();
    } finally {
      setPending("");
    }
  }

  const registerReady =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.organization.trim() &&
    form.role.trim() &&
    form.email.trim();

  // State is genuinely unresolved only when the server could not seed it.
  // Never guess a phase: show a neutral branded fallback, never Welcome.
  if (!ctx) {
    return (
      <div className="md-app">
        <EventHeader stage={null} showTitle={false} />
        <section className="md-reveal md-loading" aria-busy="true">
          <EventLockup height={30} />
          <h1 className="md-display md-loading-title">Махни досадното</h1>
          <p className="md-support">Зареждаме събитието…</p>
          <span className="md-loading-dot" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {error ? (
            <p className="md-status is-error" role="status">
              {error}
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  const showWelcome = view === "register" && !entered;

  return (
    <div className={view === "results" ? "md-app is-results" : "md-app"}>
      <EventHeader stage={ctx.participant ? stage : null} showTitle={Boolean(ctx.participant)} />
      {error ? (
        <p className="md-status is-error" role="status">
          {error}
        </p>
      ) : null}

      {showWelcome ? <Welcome onStart={() => setEntered(true)} /> : null}

      {ctx && view === "register" && entered ? (
        <RegisterForm
          form={form}
          setForm={setForm}
          ready={Boolean(registerReady)}
          pending={pending === "register"}
          onSubmit={() => void register()}
          onBack={() => setEntered(false)}
        />
      ) : null}

      {ctx && view === "ideas" && justSent ? (
        <section className="md-reveal md-confirm">
          <span className="md-confirm-mark" aria-hidden="true">
            <PlaneIcon />
          </span>
          <h1 className="md-display">Идеята е добавена</h1>
          <p className="md-support">Благодарим. Помагате да открием реалните възможности за подобрение.</p>
          <p className="md-muted">Идеи от вас: {ctx.ideaCount}</p>
          <button
            type="button"
            className="md-btn"
            onClick={() => {
              focusIdea.current = true;
              setJustSent(false);
            }}
          >
            + Имам още една
          </button>
          <p className="md-next">Когато споделянето приключи, идеите се събират в общи теми.</p>
        </section>
      ) : null}

      {ctx && view === "ideas" && !justSent && stage ? (
        <section className="md-reveal">
          <h1 className="md-question md-display">Какво ви губи време?</h1>
          <p className="md-support">
            Опишете повтаряща се задача, досаден процес или нещо от работата, което може да се прави по-лесно.
          </p>
          <form
            className="md-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (ideaBody.trim()) void submitIdea();
            }}
          >
            <label className="md-field">
              <span className="sr-only">Вашата идея</span>
              <textarea
                id={formId}
                className="md-textarea is-hero"
                value={ideaBody}
                maxLength={4000}
                rows={7}
                placeholder="Опишете го с няколко изречения"
                onChange={(event) => setIdeaBody(event.target.value)}
              />
            </label>
            {!ideaBody ? (
              <p className="md-hint">Например: често ръчно събираме данни от ведомости в различни формати.</p>
            ) : null}
            <p className="md-freq-label" id={`${formId}-freq`}>
              Колко често се случва?
            </p>
            <div className="md-freq" role="group" aria-labelledby={`${formId}-freq`}>
              {IDEA_FREQUENCIES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={frequency === item ? "md-chip is-on" : "md-chip"}
                  aria-pressed={frequency === item}
                  onClick={() => setFrequency(frequency === item ? "" : item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="submit" className="md-btn" disabled={!ideaBody.trim() || pending === "idea"}>
              Изпрати идеята
            </button>
          </form>
          {ctx.ideaCount > 0 ? <p className="md-muted">Идеи от вас: {ctx.ideaCount}</p> : null}
        </section>
      ) : null}

      {ctx && view === "analyzing" ? (
        <section className="md-reveal">
          <h1 className="md-question md-display">Събираме и подреждаме идеите</h1>
          <p className="md-support">Много отделни наблюдения се превръщат в общи теми.</p>
          <GroupingDiagram />
          <ThemeEquation
            ideas={snapshot?.stats.ideas ?? ctx.ideaCount}
            themes={snapshot?.groupedThemeCount ?? 0}
            extra={snapshot?.wildcardCount ?? 0}
            ready={(snapshot?.groupedThemeCount ?? 0) > 0}
          />
          <p className="md-next">След това ще изберете кои теми са най-важни.</p>
        </section>
      ) : null}

      {ctx && view === "waiting" ? (
        <section className="md-reveal md-wait">
          <h1 className="md-display">Още не е отворено</h1>
          <p className="md-support">Останете наблизо. Когато споделянето започне, ще можете да опишете какво ви губи време.</p>
        </section>
      ) : null}

      {ctx && view === "vote" ? (
        <section className="md-reveal">
          <h1 className="md-question md-display">Кои теми са най-важни?</h1>
          <p className="md-vote-left">{ctx.votesRemaining === 0 ? "Гласовете ви са използвани" : votesRemainingLabel(ctx.votesRemaining)}</p>
          <ul className="md-theme-list">
            {(snapshot?.themes ?? []).map((theme, index) => {
              const voted = ctx.votedThemeIds.includes(theme.id);
              const noted = ctx.interestThemeIds.includes(theme.id);
              const open = expanded === theme.id;
              return (
                <li key={theme.id} className={voted ? "md-theme is-on" : "md-theme"}>
                  <div className="md-theme-main">
                    <Image
                      src={THUMBS[index % THUMBS.length]!}
                      alt=""
                      width={88}
                      height={64}
                      className="md-theme-photo"
                    />
                    <div className="md-theme-copy">
                      <h2>{theme.title}</h2>
                      <p>
                        {theme.isAiWildcard
                          ? "Допълнителна идея от ИИ"
                          : `${theme.ideaCount} идеи · ${theme.organizationCount} организации`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={voted ? "md-pick is-on" : "md-pick"}
                      aria-pressed={voted}
                      aria-label={voted ? `Гласът за ${theme.title} е даден` : `Гласувай за ${theme.title}`}
                      disabled={voted || ctx.votesRemaining <= 0 || pending === theme.id}
                      onClick={() => void vote(theme.id)}
                    >
                      {voted ? <CheckIcon size={18} /> : null}
                    </button>
                  </div>
                  {theme.description ? (
                    <p className={open ? "md-theme-desc" : "md-theme-desc is-clamped"}>{theme.description}</p>
                  ) : null}
                  {theme.description && theme.description.length > 140 ? (
                    <button type="button" className="md-text-btn" onClick={() => setExpanded(open ? null : theme.id)}>
                      {open ? "По-кратко" : "Още"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={noted ? "md-interest is-on" : "md-interest"}
                    disabled={noted || pending === `interest-${theme.id}`}
                    onClick={() => void interest(theme.id)}
                  >
                    {noted ? "Отбелязано: имаме подобен проблем" : "Имаме подобен проблем и при нас"}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="md-next">След гласуването ИИ разглежда същите теми независимо.</p>
        </section>
      ) : null}

      {ctx && view === "finalizing" ? (
        <section className="md-reveal md-finalizing">
          <h1 className="md-display">{countdown !== null && countdown <= 30 ? "Последни 30 секунди" : "Последни секунди"}</h1>
          <p className="md-clock md-display">{formatClock(countdown)}</p>
          <p className="md-support">Изборът на участниците се запазва. След това ИИ разглежда темите независимо.</p>
        </section>
      ) : null}

      {ctx && view === "jury" ? (
        <section className="md-reveal">
          <h1 className="md-question md-display">
            {(snapshot?.juryLenses ?? []).length > 0 && (snapshot?.juryLenses ?? []).every((lens) => lens.status === "succeeded")
              ? "Вторият поглед е готов."
              : "Хората вече избраха важните теми."}
          </h1>
          <p className="md-support">ИИ разглежда същите теми независимо.</p>
          <LensBoard lenses={snapshot?.juryLenses ?? null} />
          <p className="md-next">След това показваме какво излезе напред.</p>
        </section>
      ) : null}

      {ctx && view === "results" && snapshot ? (
        <ResultsView
          snapshot={snapshot}
          followupThemeIds={ctx.followupThemeIds}
          pending={pending}
          message={message}
          onFollowup={(themeId, title) => void followup(themeId, title)}
        />
      ) : null}
    </div>
  );
}

function EventHeader({ stage, showTitle }: { stage: StoryStage | null; showTitle: boolean }) {
  return (
    <header className="md-bar">
      <div className="md-bar-brand">
        <EventLockup height={28} />
        {showTitle ? <p className="md-bar-event">Махни досадното</p> : null}
      </div>
      {stage ? <ParticipantStage stage={stage} /> : null}
      {stage ? <StageProgress stage={stage} /> : null}
    </header>
  );
}

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <section className="md-reveal">
      <h1 className="md-display md-welcome-title">Махни досадното</h1>
      <div className="md-photo">
        <Image
          src="/event/mahni/welcome.webp"
          alt="Пречиствателни басейни, язовир и планина"
          fill
          sizes="(max-width: 840px) 100vw, 430px"
          className="md-photo-img"
        />
      </div>
      <h2 className="md-question md-display">Какво ви губи време?</h2>
      <p className="md-support">Споделете реални проблеми и повтарящо се търкане от работата ви.</p>
      <ol className="md-beats">
        <li>
          <StageGlyph stage={1} size={18} />
          <span>Споделяте идея.</span>
        </li>
        <li>
          <StageGlyph stage={3} size={18} />
          <span>Заедно избираме важните теми.</span>
        </li>
        <li>
          <StageGlyph stage={5} size={18} />
          <span>Резултатите водят до реален разговор.</span>
        </li>
      </ol>
      <button type="button" className="md-btn" onClick={onStart}>
        Започваме
      </button>
    </section>
  );
}

function RegisterForm({
  form,
  setForm,
  ready,
  pending,
  onSubmit,
  onBack,
}: {
  form: {
    firstName: string;
    lastName: string;
    organization: string;
    role: string;
    email: string;
    phone: string;
    marketingConsent: boolean;
  };
  setForm: (next: typeof form) => void;
  ready: boolean;
  pending: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <section className="md-reveal">
      <h1 className="md-question md-display">Вашите данни</h1>
      <p className="md-support">Нужни са, за да свържем идеята с организацията и да отворим разговор след резултата.</p>
      <form
        className="md-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (ready) onSubmit();
        }}
      >
        <div className="md-fields two">
          <label>
            <span>Име</span>
            <input
              name="given-name"
              autoComplete="given-name"
              enterKeyHint="next"
              value={form.firstName}
              onChange={(event) => setForm({ ...form, firstName: event.target.value })}
              required
            />
          </label>
          <label>
            <span>Фамилия</span>
            <input
              name="family-name"
              autoComplete="family-name"
              enterKeyHint="next"
              value={form.lastName}
              onChange={(event) => setForm({ ...form, lastName: event.target.value })}
              required
            />
          </label>
        </div>
        <label>
          <span>Организация</span>
          <input
            name="organization"
            autoComplete="organization"
            enterKeyHint="next"
            value={form.organization}
            onChange={(event) => setForm({ ...form, organization: event.target.value })}
            required
          />
        </label>
        <label>
          <span>Длъжност</span>
          <input
            name="organization-title"
            autoComplete="organization-title"
            enterKeyHint="next"
            value={form.role}
            onChange={(event) => setForm({ ...form, role: event.target.value })}
            required
          />
        </label>
        <label>
          <span>Имейл</span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="next"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>
        <label>
          <span>Телефон, по избор</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            enterKeyHint="done"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
        </label>
        <label className="md-consent">
          <input
            type="checkbox"
            checked={form.marketingConsent}
            onChange={(event) => setForm({ ...form, marketingConsent: event.target.checked })}
          />
          <span>Искам да получа резултатите от инициативата и последващи материали, свързани с идеите от конференцията.</span>
        </label>
        <button type="submit" className="md-btn" disabled={!ready || pending}>
          Продължи
        </button>
        <button type="button" className="md-text-btn md-back" onClick={onBack}>
          Назад
        </button>
      </form>
    </section>
  );
}

function ResultsView({
  snapshot,
  followupThemeIds,
  pending,
  message,
  onFollowup,
}: {
  snapshot: PublicLiveSnapshot;
  followupThemeIds: string[];
  pending: string;
  message: string;
  onFollowup: (themeId: string, title: string) => void;
}) {
  const aiIds = new Set(snapshot.aiTop3.map((row) => row.id));
  const humanIds = new Set(snapshot.humanTop3.map((row) => row.id));
  const shared = snapshot.humanTop3.filter((row) => aiIds.has(row.id));
  const headline = sharedPriorityHeadline(shared.length);
  const body = sharedPriorityBody(shared.length);
  const themes = snapshot.themes.length
    ? snapshot.themes
    : [...snapshot.humanTop3, ...snapshot.aiTop3].map((row) => ({
        id: row.id,
        title: row.title,
        description: "",
        isAiWildcard: row.isAiWildcard,
        voteCount: 0,
        ideaCount: 0,
        organizationCount: 0,
      }));
  const uniqueThemes = [...new Map(themes.map((theme) => [theme.id, theme])).values()];

  return (
    <section className="md-reveal md-result">
      <header className="md-result-hero">
        <h1 className="md-display">Какво излезе напред</h1>
        <div className="md-result-hero-photo" aria-hidden="true">
          <Image src="/event/mahni/aerial.webp" alt="" fill sizes="(max-width: 840px) 100vw, 1088px" className="md-result-hero-img" />
        </div>
      </header>
      <div className="md-result-grid">
        <section className="md-result-primary">
          <h2 className="md-result-primary-title">Изборът на участниците</h2>
          <ol className="md-rank">
            {snapshot.humanTop3.map((row) => (
              <li key={row.id} className={aiIds.has(row.id) ? "is-shared" : undefined}>
                <b>{String(row.rank).padStart(2, "0")}</b>
                <span>
                  {row.title}
                  {aiIds.has(row.id) ? <em>Общ приоритет</em> : null}
                </span>
              </li>
            ))}
          </ol>
        </section>
        <section className="md-result-secondary">
          <h2 className="md-result-secondary-title">Независим поглед от ИИ</h2>
          <ol className="md-rank is-quiet">
            {snapshot.aiTop3.map((row) => (
              <li key={row.id} className={humanIds.has(row.id) ? "is-shared" : undefined}>
                <b>{String(row.rank).padStart(2, "0")}</b>
                <span>{row.title}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
      {headline && body ? (
        <aside className="md-shared">
          <ConvergeIcon size={22} />
          <div>
            <h2>{headline}</h2>
            <p>{body}</p>
          </div>
        </aside>
      ) : null}
      <p className="md-official">Официалният резултат е изборът на участниците.</p>

      <div className="md-action">
        <h2>От резултат към действие</h2>
        <p>Ако някоя тема ви засяга пряко, можете да поискате разговор. Резултатът отгоре остава изборът на участниците.</p>
        {message ? (
          <p className="md-status" role="status">
            {message}
          </p>
        ) : null}
        <ul className="md-context-list">
          {uniqueThemes.map((theme) => {
            const saved = followupThemeIds.includes(theme.id);
            return (
              <li key={theme.id}>
                <div>
                  <h3>{theme.title}</h3>
                  <p>{theme.isAiWildcard ? "Допълнителна идея от ИИ" : `${theme.ideaCount} идеи · ${theme.organizationCount} организации`}</p>
                </div>
                <button
                  type="button"
                  className={saved ? "md-follow is-on" : "md-follow"}
                  disabled={saved || pending === `follow-${theme.id}`}
                  onClick={() => onFollowup(theme.id, theme.title)}
                >
                  {saved ? "Записано" : "Искам разговор"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
