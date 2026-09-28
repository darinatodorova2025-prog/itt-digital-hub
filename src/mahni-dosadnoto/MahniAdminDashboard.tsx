"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AnalysisRun, EventCampaign, EventPhase, Participant, Theme } from "@/mahni-dosadnoto/types";
import type { WinningThemeContacts } from "@/mahni-dosadnoto/admin/winners";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import type { JuryProgress } from "@/mahni-dosadnoto/jury-status";
import { LENS_COPY, operatorPhaseNote, operatorPhaseTitle, storyForPhase } from "@/mahni-dosadnoto/presentation";
import { CheckIcon, OrgIcon, PeopleIcon, StageGlyph } from "@/mahni-dosadnoto/icons";
import { AdminRail } from "@/mahni-dosadnoto/journey";
import {
  mdAdminSnapshot,
  mdCloseCollection,
  mdCloseEvent,
  mdPrepareNextEvent,
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
} from "@/app/admin/(console)/mahni-dosadnoto/actions";

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

type ActionId =
  | "collect"
  | "close-collect"
  | "analysis"
  | "vote"
  | "final"
  | "close-vote"
  | "jury"
  | "retry-jury"
  | "results"
  | "closed";

export function MahniAdminDashboard({ initial }: Props) {
  const [snapshot, setSnapshot] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real" | null>(null);
  const [query, setQuery] = useState("");
  const [csv, setCsv] = useState("");
  const campaign = snapshot.campaign;
  const jury = snapshot.juryProgress;
  const latestAnalysis = snapshot.analysisRuns[0] ?? null;
  const analysisReady = snapshot.themes.length > 0;
  const analysisRunning = latestAnalysis?.status === "running" || latestAnalysis?.status === "pending";
  const organizations = useMemo(() => {
    return new Set(snapshot.participants.map((person) => person.organization.trim().toLocaleLowerCase("bg"))).size;
  }, [snapshot.participants]);

  // In-place refresh: reuse the admin snapshot server action so operational
  // data updates without a full document reload and without losing scroll.
  const refresh = async () => {
    const y = window.scrollY;
    try {
      const next = await mdAdminSnapshot();
      setSnapshot(next);
      requestAnimationFrame(() => window.scrollTo(0, y));
    } catch {
      // Keep the last good snapshot on a transient refresh failure.
    }
  };

  useEffect(() => {
    if (busy || confirm) return;
    if (campaign.phase === "DRAFT" || campaign.phase === "CLOSED") return;
    const id = window.setInterval(() => void refresh(), campaign.phase === "FINALIZING" ? 5000 : 8000);
    return () => window.clearInterval(id);
  }, [busy, confirm, campaign.phase]);

  const analysisFailed = !analysisReady && !analysisRunning && latestAnalysis?.status === "failed";
  const primary = recommendedAction(campaign.phase, analysisReady, analysisRunning, analysisFailed, jury);
  const active = campaign.phase !== "DRAFT" && campaign.phase !== "CLOSED";
  const stage = storyForPhase(campaign.phase);
  const voteById = new Map(snapshot.live.themes.map((theme) => [theme.id, theme.voteCount]));
  const themesSorted = [...snapshot.themes].sort(
    (a, b) => (voteById.get(b.id) ?? 0) - (voteById.get(a.id) ?? 0) || a.sortOrder - b.sortOrder,
  );
  const liveRank = [...snapshot.live.themes].sort((a, b) => b.voteCount - a.voteCount || a.title.localeCompare(b.title, "bg"));

  async function execute(id: ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real") {
    setBusy(id);
    setError("");
    setConfirm(null);
    try {
      await actionRunners[id]();
      await refresh();
      setBusy("");
    } catch {
      setBusy("");
      await refresh();
      setError(
        id === "analysis"
          ? "Подреждането не завърши. Фазата остава „Подреждаме“. Натиснете „Повтори подреждането“."
          : "Действието не завърши. Обновете страницата и проверете фазата.",
      );
    }
  }

  function ask(id: ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real") {
    if (needsConfirm(id)) setConfirm(id);
    else void execute(id);
  }

  const filtered = snapshot.participants.filter((person) => {
    const hay = `${person.firstName} ${person.lastName} ${person.organization} ${person.role} ${person.email}`.toLocaleLowerCase("bg");
    return hay.includes(query.trim().toLocaleLowerCase("bg"));
  });

  const failedAnalysis = snapshot.analysisRuns.filter((run) => run.status === "failed");

  const themeById = new Map(snapshot.themes.map((theme) => [theme.id, theme]));

  return (
    <div className="md-ops" lang="bg">
      <header className="md-ops-head" id="ops-room">
        <div>
          <p className="md-ops-kicker">Контролна зала</p>
          <h1>Махни досадното</h1>
        </div>
        <p className={active ? "md-ops-live is-on" : "md-ops-live"}>
          <i />
          {campaign.phase === "CLOSED" ? "Събитието е приключено" : campaign.phase === "DRAFT" ? "Очаква старт" : "Събитието е активно"}
        </p>
      </header>

      <nav className="md-ops-jump" aria-label="Секции на контролната зала">
        <a href="#ops-room">Контролна зала</a>
        <a href="#ops-people">Участници</a>
        <a href="#ops-themes">Теми</a>
        <a href="#ops-orgs">Организации</a>
        <a href="#ops-export">Експорт</a>
        <Link href="/bg">Към сайта</Link>
      </nav>

      <section className="md-ops-phase">
        <div className="md-ops-phase-copy">
          {stage ? (
            <span className="md-ops-phase-mark" aria-hidden="true">
              <StageGlyph stage={stage.n} size={22} />
            </span>
          ) : null}
          <div>
            <p className="md-ops-kicker">Текуща фаза</p>
            <h2>{operatorPhaseTitle(campaign.phase)}</h2>
            <p>{operatorPhaseNote(campaign.phase)}</p>
            {campaign.phase === "FINALIZING" && snapshot.live.countdownSeconds !== null ? (
              <p className="md-ops-note">Остават около {snapshot.live.countdownSeconds} секунди</p>
            ) : null}
          </div>
        </div>
        <div className="md-ops-next">
          <p className="md-ops-kicker">Следващо действие</p>
          {primary ? (
            <button type="button" className="md-ops-primary" disabled={!!busy || primary.disabled} onClick={() => ask(primary.id)}>
              {busy === primary.id ? "Изпълнява се…" : primary.label}
            </button>
          ) : (
            <p className="md-ops-note">Няма следваща стъпка.</p>
          )}
          {analysisRunning && campaign.phase === "ANALYZING" ? <p className="md-ops-note">Подреждането тече.</p> : null}
          {analysisFailed && campaign.phase === "ANALYZING" ? (
            <p className="md-ops-note">Подреждането не завърши. Фазата остава същата. Повторете действието.</p>
          ) : null}
        </div>
      </section>

      <AdminRail stage={stage} />

      {advancedActions(campaign.phase, primary?.id ?? null, jury).length > 0 ? (
        <details className="md-ops-advanced">
          <summary>Други действия</summary>
          <div className="md-ops-advanced-row">
            {advancedActions(campaign.phase, primary?.id ?? null, jury).map((id) => (
              <button key={id} type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask(id)}>
                {ACTION_LABEL[id]}
              </button>
            ))}
          </div>
        </details>
      ) : null}

      {confirm ? (
        <div className="md-ops-confirm" role="alertdialog" aria-label="Потвърждение">
          <p>{confirmCopy(confirm)}</p>
          <div className="md-ops-confirm-actions">
            <button type="button" className="md-ops-primary" disabled={!!busy} onClick={() => void execute(confirm)}>
              Потвърди
            </button>
            <button type="button" className="md-ops-btn" onClick={() => setConfirm(null)}>
              Отказ
            </button>
          </div>
        </div>
      ) : null}
      {error ? <p className="md-ops-error">{error}</p> : null}

      <section className="md-ops-metrics" aria-label="Обобщение">
        <Metric icon={<PeopleIcon size={18} />} value={snapshot.counts.participants} label="Участници" />
        <Metric icon={<OrgIcon size={18} />} value={organizations} label="Организации" />
        <Metric icon={<StageGlyph stage={1} size={18} />} value={snapshot.counts.ideas} label="Идеи" />
        <Metric icon={<StageGlyph stage={3} size={18} />} value={snapshot.counts.votes} label="Гласове" />
        <Metric icon={<StageGlyph stage={5} size={18} />} value={snapshot.counts.followups} label="Заявки за разговор" />
      </section>

      <section className="md-ops-now" aria-label="Какво вижда залата">
        <div>
          <p className="md-ops-kicker">Какво вижда залата</p>
          <p className="md-ops-now-phase">{roomSees(campaign.phase)}</p>
        </div>
        <div className="md-ops-now-actions">
          <a className="md-ops-link" href="/bg/mahni-dosadnoto/live" target="_blank" rel="noreferrer">
            Отвори екрана
          </a>
          <button type="button" className="md-ops-btn" onClick={() => void mdToggleRecentIdeas(!campaign.showRecentIdeas).then(() => refresh())}>
            Последни идеи: {campaign.showRecentIdeas ? "включени" : "изключени"}
          </button>
        </div>
      </section>

      <section className="md-ops-section md-ops-split">
        <article className="md-ops-panel">
          <h2>ИИ статус</h2>
          <p className="md-ops-ai-line">
            <StatusMark ok={analysisReady} busy={analysisRunning} />
            <span>
              Анализ ·{" "}
              {analysisReady
                ? `Завършен · ${snapshot.themes.filter((theme) => !theme.isAiWildcard).length} теми`
                : analysisRunning
                  ? "Тече"
                  : latestAnalysis?.status === "failed"
                    ? "Необходимо е повторение"
                    : "Още не е пускан"}
            </span>
          </p>
          <ul className="md-ops-judges">
            {jury.judges.map((judge) => (
              <li key={judge.judge}>
                <StatusMark ok={judge.status === "succeeded"} busy={judge.status === "running" || judge.status === "pending"} />
                <span>{LENS_COPY[judge.judge].title}</span>
                <em>{judgeStatus(judge.status)}</em>
              </li>
            ))}
          </ul>
          {campaign.phase === "AI_JURY" && !jury.complete && primary?.id !== "retry-jury" ? (
            <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("retry-jury")}>
              Повтори неуспешните
            </button>
          ) : null}
          <details>
            <summary>Покажи технически детайли</summary>
            {failedAnalysis.slice(0, 3).map((run) => (
              <pre key={run.id}>
                {run.errorCode ?? "failed"}
                {run.errorMessage ? `\n${run.errorMessage}` : ""}
              </pre>
            ))}
            {jury.judges.map((judge) => (
              <pre key={judge.judge}>
                {LENS_COPY[judge.judge].title} · {judge.status}
                {judge.errorCode ? `\n${judge.errorCode}` : ""}
                {judge.errorMessage ? `\n${judge.errorMessage}` : ""}
              </pre>
            ))}
          </details>
        </article>
        <article className="md-ops-panel" id="ops-top">
          <h2>{snapshot.live.humanTop3.length > 0 ? "Изборът на участниците" : "Топ теми"}</h2>
          {snapshot.live.humanTop3.length > 0 ? (
            <ol className="md-ops-rank">
              {snapshot.live.humanTop3.map((row) => {
                const theme = themeById.get(row.id);
                return (
                  <li key={row.id}>
                    <b>{String(row.rank).padStart(2, "0")}</b>
                    <span>
                      {row.title}
                      {theme ? (
                        <small>
                          {theme.ideaCount} идеи · {theme.organizationCount} орг.
                        </small>
                      ) : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : liveRank.some((theme) => theme.voteCount > 0) ? (
            <>
              <p className="md-ops-note">Официалният топ 3 се заключва след гласуването.</p>
              <ol className="md-ops-rank">
                {liveRank.slice(0, 5).map((theme, index) => (
                  <li key={theme.id}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <span>
                      {theme.title}
                      <small>
                        {theme.ideaCount} идеи · {theme.organizationCount} орг. · {theme.voteCount} гласа
                      </small>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <p className="md-ops-note">Още няма класиране.</p>
          )}
          {snapshot.live.aiTop3.length > 0 ? (
            <div className="md-ops-ai-quiet">
              <h3>Независим поглед от ИИ</h3>
              <ol className="md-ops-rank is-quiet">
                {snapshot.live.aiTop3.map((row) => (
                  <li key={row.id}>
                    <b>{String(row.rank).padStart(2, "0")}</b>
                    <span>{row.title}</span>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </article>
      </section>

      <section className="md-ops-section" id="ops-people">
        <h2>Участници ({snapshot.participants.length})</h2>
        <p className="md-ops-count">
          {filtered.length} от {snapshot.participants.length}
        </p>
        <input
          className="md-ops-search"
          type="search"
          placeholder="Търсене по име, организация, имейл"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="md-ops-table-wrap">
          <table className="md-ops-table">
            <thead>
              <tr>
                <th>Име</th>
                <th>Организация</th>
                <th>Длъжност</th>
                <th>Имейл</th>
                <th>Телефон</th>
                <th>Съгласие</th>
                <th>Идеи</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => (
                <tr key={person.id}>
                  <td>
                    {person.firstName} {person.lastName}
                  </td>
                  <td>{person.organization}</td>
                  <td>{person.role}</td>
                  <td>{person.email}</td>
                  <td>{person.phone || "—"}</td>
                  <td>{person.marketingConsent ? "Да" : "Не"}</td>
                  <td>{person.ideaCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="md-ops-section" id="ops-orgs">
        <h2>Организации за контакт</h2>
        {snapshot.winningOrganizations.length === 0 ? (
          <p className="md-ops-note">Ще се появи, когато има теми и класиране.</p>
        ) : (
          snapshot.winningOrganizations.map((row) => (
            <article key={row.themeId} className="md-ops-winner">
              <p className="md-ops-kicker">Топ {row.rank}</p>
              <h3>{row.themeTitle}</h3>
              <div className="md-ops-table-wrap">
                <table className="md-ops-table">
                  <thead>
                    <tr>
                      <th>Организация</th>
                      <th>Контакт</th>
                      <th>Имейл</th>
                      <th>Телефон</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.organizations.flatMap((org) =>
                      org.contacts.length
                        ? org.contacts.map((contact) => (
                            <tr key={`${org.organization}-${contact.email}`}>
                              <td>{org.organization}</td>
                              <td>{contact.name}</td>
                              <td>{contact.email}</td>
                              <td>{contact.phone || "—"}</td>
                            </tr>
                          ))
                        : [
                            <tr key={org.organization}>
                              <td>{org.organization}</td>
                              <td>—</td>
                              <td>—</td>
                              <td>—</td>
                            </tr>,
                          ],
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="md-ops-section" id="ops-themes">
        <h2>Теми ({snapshot.themes.length})</h2>
        <div className="md-ops-table-wrap">
          <table className="md-ops-table">
            <thead>
              <tr>
                <th>Ранг</th>
                <th>Тема</th>
                <th>Идеи</th>
                <th>Организации</th>
              </tr>
            </thead>
            <tbody>
              {themesSorted.map((theme, index) => (
                <tr key={theme.id}>
                  <td>{String(index + 1).padStart(2, "0")}</td>
                  <td>
                    {theme.title}
                    {theme.isAiWildcard ? <span className="md-ops-tag">Допълнителна идея от ИИ</span> : null}
                  </td>
                  <td>{theme.ideaCount}</td>
                  <td>{theme.organizationCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {campaign.phase === "CLOSED" ? (
        <section className="md-ops-prepare" id="ops-prepare">
          <p className="md-ops-kicker">След затворено събитие</p>
          <h2>Подготви ново събитие</h2>
          <p>Затвореното събитие и данните му остават запазени. Новото започва празно и чака старт.</p>
          <div className="md-ops-demo-actions">
            <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("prepare-rehearsal")}>
              Репетиция
            </button>
            <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("prepare-real")}>
              Реално събитие
            </button>
          </div>
        </section>
      ) : null}

      <section className="md-ops-demo" id="ops-demo">
        <p className="md-ops-kicker">Не е част от живото събитие</p>
        <h2>Демо / репетиция</h2>
        <p>Тези действия пипат само демо записи и стоят отделно от основното следващо действие.</p>
        <div className="md-ops-demo-actions">
          <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("seed")}>
            Зареди демо данни
          </button>
          <button type="button" className="md-ops-btn danger" disabled={!!busy} onClick={() => ask("reset")}>
            Изчисти демо данните
          </button>
        </div>
      </section>

      <section className="md-ops-section" id="ops-export">
        <h2>Експорт</h2>
        <button type="button" className="md-ops-btn" onClick={() => void mdExportCsv().then(setCsv)}>
          Генерирай CSV
        </button>
        {csv ? <textarea className="md-ops-csv" readOnly value={csv} /> : null}
      </section>
    </div>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <div>
      <span className="md-ops-metric-icon">{icon}</span>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function StatusMark({ ok, busy }: { ok: boolean; busy?: boolean }) {
  return <span className={ok ? "md-ops-mark is-ok" : busy ? "md-ops-mark is-busy" : "md-ops-mark"}>{ok ? <CheckIcon size={14} /> : null}</span>;
}

const ACTION_LABEL: Record<ActionId, string> = {
  collect: "Стартирай събитието",
  "close-collect": "Приключи споделянето",
  analysis: "Подреждане на идеите",
  vote: "Отвори избора",
  final: "Последни секунди",
  "close-vote": "Затвори гласуването",
  jury: "Стартирай втория поглед",
  "retry-jury": "Повтори неуспешните",
  results: "Покажи резултата",
  closed: "Приключи събитието",
};

async function drainJury(run: () => Promise<{ succeeded: number; complete: boolean }>) {
  let previous = -1;
  for (let pass = 0; pass < 3; pass++) {
    const result = await run();
    if (result.complete || result.succeeded <= previous) return;
    previous = result.succeeded;
  }
}

const actionRunners: Record<ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real", () => Promise<void>> = {
  collect: () => mdStartCollecting(),
  "close-collect": () => mdCloseCollection(),
  analysis: () => mdRunAnalysis(),
  vote: () => mdOpenVoting(),
  final: () => mdStartFinalCountdown(),
  "close-vote": () => mdCloseVoting(),
  jury: () => drainJury(() => mdRunJury()),
  "retry-jury": () => drainJury(() => mdRetryJury()),
  results: () => mdRevealResults(),
  closed: () => mdCloseEvent(),
  seed: () => mdSeedDemo(),
  reset: () => mdResetDemo(),
  "prepare-rehearsal": () => mdPrepareNextEvent(true),
  "prepare-real": () => mdPrepareNextEvent(false),
};

function needsConfirm(id: ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real"): boolean {
  return (
    id === "closed" ||
    id === "seed" ||
    id === "reset" ||
    id === "close-collect" ||
    id === "close-vote" ||
    id === "final" ||
    id === "prepare-rehearsal" ||
    id === "prepare-real"
  );
}

function confirmCopy(id: ActionId | "seed" | "reset" | "prepare-rehearsal" | "prepare-real"): string {
  switch (id) {
    case "prepare-rehearsal":
      return "Ще се отвори нова празна репетиция. Затвореното събитие остава запазено и няма да бъде изтрито.";
    case "prepare-real":
      return "Ще се отвори ново празно реално събитие. Затвореното събитие остава запазено и няма да бъде изтрито.";
    case "seed":
      return "Ще бъдат добавени демо участници и идеи, а фазата ще стане „Споделяме“.";
    case "reset":
      return "Ще бъдат изтрити само демо записите. Кампанията трябва да е маркирана като демо.";
    case "close-collect":
      return "Споделянето на идеи ще спре. Участниците няма да могат да добавят нови.";
    case "final":
      return "Това пуска финалното отброяване и след него гласуването се заключва.";
    case "close-vote":
      return "Гласуването ще бъде затворено и изборът на участниците ще бъде запазен.";
    case "closed":
      return "Събитието ще бъде затворено. Резултатът остава видим.";
    default:
      return "Потвърдете действието.";
  }
}

function recommendedAction(
  phase: EventPhase,
  analysisReady: boolean,
  analysisRunning: boolean,
  analysisFailed: boolean,
  jury: JuryProgress,
): { id: ActionId; label: string; disabled?: boolean } | null {
  switch (phase) {
    case "DRAFT":
      return { id: "collect", label: ACTION_LABEL.collect };
    case "COLLECTING":
      return { id: "close-collect", label: ACTION_LABEL["close-collect"] };
    case "ANALYZING":
      if (analysisReady) return { id: "vote", label: ACTION_LABEL.vote };
      if (analysisRunning) return { id: "analysis", label: "Подреждането тече", disabled: true };
      if (analysisFailed) return { id: "analysis", label: "Повтори подреждането" };
      return { id: "analysis", label: ACTION_LABEL.analysis };
    case "VOTING":
      return { id: "final", label: ACTION_LABEL.final };
    case "FINALIZING":
      return { id: "close-vote", label: ACTION_LABEL["close-vote"] };
    case "AI_JURY":
      if (jury.complete) return { id: "results", label: ACTION_LABEL.results };
      if (jury.succeeded > 0 || jury.judges.some((judge) => judge.status === "failed" || judge.status === "running")) {
        return { id: "retry-jury", label: ACTION_LABEL["retry-jury"] };
      }
      return { id: "jury", label: ACTION_LABEL.jury };
    case "RESULTS":
      return { id: "closed", label: ACTION_LABEL.closed };
    default:
      return null;
  }
}

function advancedActions(phase: EventPhase, primaryId: ActionId | null, jury: JuryProgress): ActionId[] {
  const pool: ActionId[] = [];
  if (phase === "ANALYZING" && primaryId !== "analysis") pool.push("analysis");
  if (phase === "VOTING") pool.push("close-vote");
  if (phase === "AI_JURY" && primaryId !== "jury") pool.push("jury");
  if (phase === "AI_JURY" && !jury.complete && primaryId !== "retry-jury") pool.push("retry-jury");
  if (phase === "RESULTS") pool.push("closed");
  return pool.filter((id) => id !== primaryId);
}

function roomSees(phase: EventPhase): string {
  if (phase === "DRAFT") return "Очаква старт";
  if (phase === "FINALIZING") return "03 · Последни секунди";
  if (phase === "CLOSED") return "05 · Резултат";
  const stage = storyForPhase(phase);
  if (stage) return `${String(stage.n).padStart(2, "0")} · ${stage.label}`;
  return operatorPhaseTitle(phase);
}

function judgeStatus(status: JuryProgress["judges"][number]["status"]): string {
  switch (status) {
    case "succeeded":
      return "Готово";
    case "failed":
      return "Необходимо повторение";
    case "running":
    case "pending":
      return "Тече";
    default:
      return "Още не е пуснато";
  }
}
