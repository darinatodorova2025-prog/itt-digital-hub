"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mark } from "@/components/layout/Logo";
import { IDEA_FREQUENCIES, type EventPhase } from "@/mahni-dosadnoto/types";
import { formatClock, overlapHeadline, votesRemainingLabel } from "@/mahni-dosadnoto/presentation";
import { useCountdown } from "@/mahni-dosadnoto/use-countdown";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";

type Context = {
  phase: EventPhase;
  campaignTitle: string;
  participant: { id: string; firstName: string; lastName: string; organization: string } | null;
  ideaCount: number;
  votesUsed: number;
  votesRemaining: number;
  votedThemeIds: string[];
  interestThemeIds: string[];
  followupThemeIds: string[];
};

type View = "register" | "ideas" | "analyzing" | "vote" | "finalizing" | "jury" | "results" | "waiting";

const PHASE_LABEL: Record<EventPhase, string> = {
  DRAFT: "Очакване",
  COLLECTING: "Споделяне",
  ANALYZING: "Анализ",
  VOTING: "Гласуване",
  FINALIZING: "Отброяване",
  AI_JURY: "Мнение на ИИ",
  RESULTS: "Резултат",
  CLOSED: "Резултат",
};

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

export function MahniParticipantApp() {
  const [ctx, setCtx] = useState<Context | null>(null);
  const [snapshot, setSnapshot] = useState<PublicLiveSnapshot | null>(null);
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
      setMessage("Идеята е добавена.");
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
      setMessage(`Записахме интереса ви за „${title}“.`);
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

  return (
    <div className={view === "results" ? "md-app is-results" : "md-app"}>
      <header className="md-bar">
        <div className="md-bar-brand">
          <Mark size={28} />
          <div>
            <p className="md-bar-name">ITT Digital Hub</p>
            <p className="md-bar-event">Махни досадното</p>
          </div>
        </div>
        {ctx?.participant ? <p className="md-phase-chip">{PHASE_LABEL[ctx.phase]}</p> : null}
      </header>

      <div className="md-stage">
        {error ? (
          <p className="md-status is-error" role="status">
            {error}
          </p>
        ) : null}

        {!ctx ? (
          <section className="md-wait" aria-busy="true">
            <p className="md-kicker">Конференция</p>
            <h1 className="md-display">Махни досадното</h1>
          </section>
        ) : null}

        {ctx && view === "register" ? (
          <section>
            <p className="md-kicker">Конференция</p>
            <h1 className="md-display">Махни досадното</h1>
            <p className="md-lead">Не търсим къде да сложим ИИ. Търсим къде организацията може да работи по-добре.</p>
            <ol className="md-steps">
              <li>
                <span>1</span>Описвате какво ви губи време.
              </li>
              <li>
                <span>2</span>Гласувате кои проблеми заслужават внимание.
              </li>
              <li>
                <span>3</span>Виждате избора на хората и независимото мнение на ИИ.
              </li>
            </ol>
            <hr className="md-rule" />
            <form
              className="md-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (registerReady) void register();
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
              <button type="submit" className="md-btn" disabled={!registerReady || pending === "register"}>
                Продължи
              </button>
            </form>
          </section>
        ) : null}

        {ctx && view === "ideas" && justSent ? (
          <section className="md-confirm">
            <p className="md-kicker">Споделено</p>
            <h2 className="md-display">Идеята е добавена.</h2>
            <p className="md-muted">Идеи от вас: {ctx.ideaCount}</p>
            <button
              type="button"
              className="md-btn plus"
              onClick={() => {
                focusIdea.current = true;
                setJustSent(false);
                setMessage("");
              }}
            >
              + Имам още една
            </button>
          </section>
        ) : null}

        {ctx && view === "ideas" && !justSent ? (
          <section>
            <p className="md-kicker">{ctx.participant?.firstName}</p>
            <h1 className="md-question md-display">Какво ви губи време?</h1>
            <p className="md-support">Опишете задача, процес или действие, което ви дразни, повтаря се или според вас може да се прави по-лесно.</p>
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
                <p className="md-hint">Например: всеки месец събираме едни и същи данни от няколко файла, преди да можем да ги ползваме.</p>
              ) : null}
              <p className="md-freq-label">Колко често, по избор</p>
              <div className="md-freq" role="group" aria-label="Колко често срещате този проблем">
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
                Изпрати
              </button>
            </form>
            {message ? (
              <p className="md-status" role="status">
                {message}
              </p>
            ) : null}
            <p className="md-muted">Идеи от вас: {ctx.ideaCount}</p>
          </section>
        ) : null}

        {ctx && view === "analyzing" ? (
          <section className="md-analyze">
            <p className="md-kicker">Следва гласуване</p>
            <h2 className="md-display">Събирането приключи</h2>
            <p className="md-support">Идеите се анализират. Останете — след малко ще гласувате.</p>
            <div className="md-scan" aria-hidden="true">
              <span />
            </div>
          </section>
        ) : null}

        {ctx && view === "waiting" ? (
          <section className="md-wait">
            <p className="md-kicker">Махни досадното</p>
            <h2 className="md-display">Още не е отворено</h2>
            <p className="md-support">Останете наблизо. Когато събирането започне, ще можете да опишете какво ви губи време.</p>
          </section>
        ) : null}

        {ctx && view === "vote" ? (
          <section>
            <h1 className="md-question md-display">Кои проблеми най-много си заслужава да разгледаме по-сериозно?</h1>
            <div className="md-vote-bar">
              <p>{ctx.votesRemaining === 0 ? "Гласовете ви са използвани" : votesRemainingLabel(ctx.votesRemaining)}</p>
              <span>до 3</span>
            </div>
            <ul className="md-theme-list">
              {(snapshot?.themes ?? []).map((theme) => {
                const voted = ctx.votedThemeIds.includes(theme.id);
                const noted = ctx.interestThemeIds.includes(theme.id);
                const open = expanded === theme.id;
                return (
                  <li key={theme.id} className={voted ? "md-theme is-voted" : "md-theme"}>
                    <div className="md-theme-top">
                      <div>
                        <h3>{theme.title}</h3>
                        {theme.isAiWildcard ? <p className="md-wildcard">Допълнителна тема</p> : null}
                      </div>
                      <button
                        type="button"
                        className="md-vote-btn"
                        disabled={voted || ctx.votesRemaining <= 0 || pending === theme.id}
                        onClick={() => void vote(theme.id)}
                      >
                        {voted ? "Гласът е даден" : "Гласувай"}
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
          </section>
        ) : null}

        {ctx && view === "finalizing" ? (
          <section className="md-wait">
            <p className="md-kicker">Гласуването приключва</p>
            <h2 className="md-display">{countdown === null ? "Последни секунди" : countdown > 30 ? "Последни секунди" : `Последни ${countdown} секунди`}</h2>
            <p className="md-overlap">{countdown === null ? "" : formatClock(countdown)}</p>
            <p className="md-support">Изборът на хората се запазва. След това ИИ дава независимо второ мнение.</p>
          </section>
        ) : null}

        {ctx && view === "jury" ? (
          <section className="md-wait">
            <p className="md-kicker">След гласуването</p>
            <h2 className="md-display">Хората вече гласуваха</h2>
            <p className="md-support">Изборът на хората е запазен. ИИ подготвя независимо второ мнение.</p>
            {snapshot?.juryTotal ? (
              <p className="md-status">
                {snapshot.juryReady ?? 0} от {snapshot.juryTotal} гледни точки готови
              </p>
            ) : null}
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
    </div>
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
    <section className="md-results-hero">
      <p className="md-kicker">Резултат</p>
      <h1 className="md-display">ХОРАТА vs ИИ</h1>
      <p className="md-overlap">{overlapHeadline(snapshot.overlap)}</p>
      <p className="md-official">Официалният резултат е изборът на хората. ИИ е независимо второ мнение.</p>
      <div className="md-vs">
        <section className="md-vs-col">
          <h2>Изборът на хората</h2>
          <ol className="md-rank">
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
        <p className="md-vs-mark">срещу</p>
        <section className="md-vs-col">
          <h2>Изборът на ИИ</h2>
          <ol className="md-rank">
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

      <div className="md-context">
        <hr className="md-rule" />
        <h2>Темите от събитието</h2>
        <p className="md-context-lead">Ако някоя ви засяга пряко, можете да поискате разговор. Резултатът отгоре остава изборът на хората.</p>
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
                  <p>
                    {theme.isAiWildcard ? "Допълнителна тема" : `${theme.ideaCount} идеи · ${theme.organizationCount} организации`}
                  </p>
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
