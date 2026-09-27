"use client";

import { useEffect, useMemo, useState } from "react";
import type { AnalysisRun, EventCampaign, EventPhase, JudgeType, Participant, Theme } from "@/mahni-dosadnoto/types";
import type { WinningThemeContacts } from "@/mahni-dosadnoto/admin/winners";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import type { JuryProgress } from "@/mahni-dosadnoto/jury-status";
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

const PHASE_BG: Record<EventPhase, string> = {
  DRAFT: "Подготовка",
  COLLECTING: "Събиране на идеи",
  ANALYZING: "Анализ на идеите",
  VOTING: "Гласуване",
  FINALIZING: "Финално отброяване",
  AI_JURY: "Независимо мнение на ИИ",
  RESULTS: "Резултатът е показан",
  CLOSED: "Събитието е приключено",
};

const JUDGE_BG: Record<JudgeType, string> = {
  business_value: "Бизнес стойност",
  feasibility: "Реализируемост",
  innovation: "Иновация",
};

export function MahniAdminDashboard({ initial }: Props) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<ActionId | "seed" | "reset" | null>(null);
  const [query, setQuery] = useState("");
  const [csv, setCsv] = useState("");
  const campaign = initial.campaign;
  const jury = initial.juryProgress;
  const latestAnalysis = initial.analysisRuns[0] ?? null;
  const analysisReady = initial.themes.length > 0;
  const analysisRunning = latestAnalysis?.status === "running" || latestAnalysis?.status === "pending";
  const organizations = useMemo(() => {
    return new Set(initial.participants.map((person) => person.organization.trim().toLocaleLowerCase("bg"))).size;
  }, [initial.participants]);

  useEffect(() => {
    if (busy || confirm) return;
    if (!["ANALYZING", "AI_JURY", "FINALIZING"].includes(campaign.phase)) return;
    const id = window.setInterval(() => window.location.reload(), campaign.phase === "FINALIZING" ? 5000 : 8000);
    return () => window.clearInterval(id);
  }, [busy, confirm, campaign.phase]);

  const primary = recommendedAction(campaign.phase, analysisReady, analysisRunning, jury);

  async function execute(id: ActionId | "seed" | "reset") {
    setBusy(id);
    setError("");
    setConfirm(null);
    try {
      await actionRunners[id]();
      window.location.reload();
    } catch {
      setBusy("");
      setError("Действието не завърши. Обновете страницата и проверете фазата.");
    }
  }

  function ask(id: ActionId | "seed" | "reset") {
    if (needsConfirm(id)) setConfirm(id);
    else void execute(id);
  }

  const filtered = initial.participants.filter((person) => {
    const hay = `${person.firstName} ${person.lastName} ${person.organization} ${person.role} ${person.email}`.toLocaleLowerCase("bg");
    return hay.includes(query.trim().toLocaleLowerCase("bg"));
  });

  const failedAnalysis = initial.analysisRuns.filter((run) => run.status === "failed");

  return (
    <div className="md-ops">
      <header className="md-ops-head">
        <p>Контролна зала</p>
        <h1>Махни досадното</h1>
      </header>

      <section className="md-ops-phase">
        <div>
          <p className="md-ops-kicker">Текуща фаза</p>
          <h2>{campaign.phase}</h2>
          <p className="md-ops-phase-bg">{PHASE_BG[campaign.phase]}</p>
          {campaign.phase === "FINALIZING" && initial.live.countdownSeconds !== null ? (
            <p className="md-ops-phase-bg">Остават около {initial.live.countdownSeconds} секунди</p>
          ) : null}
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
        </div>
        <div className="md-ops-next">
          <p className="md-ops-kicker">Следваща стъпка</p>
          {primary ? (
            <button type="button" className="md-ops-primary" disabled={!!busy || primary.disabled} onClick={() => ask(primary.id)}>
              {busy === primary.id ? "Изпълнява се…" : primary.label}
            </button>
          ) : (
            <p className="md-ops-phase-bg">Няма следваща стъпка.</p>
          )}
          {analysisRunning && campaign.phase === "ANALYZING" ? <p className="md-ops-phase-bg">Анализът тече.</p> : null}
        </div>
      </section>

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

      <section className="md-ops-stats" aria-label="Обобщение">
        <div>
          <strong>{initial.counts.participants}</strong>
          <span>Участници</span>
        </div>
        <div>
          <strong>{organizations}</strong>
          <span>Организации</span>
        </div>
        <div>
          <strong>{initial.counts.ideas}</strong>
          <span>Идеи</span>
        </div>
        <div>
          <strong>{initial.counts.votes}</strong>
          <span>Гласове</span>
        </div>
        <div>
          <strong>{initial.counts.followups}</strong>
          <span>Заявки за разговор</span>
        </div>
      </section>

      <section className="md-ops-screen">
        <button type="button" className="md-ops-btn" onClick={() => void mdToggleRecentIdeas(!campaign.showRecentIdeas).then(() => window.location.reload())}>
          Последни идеи на екрана: {campaign.showRecentIdeas ? "включени" : "изключени"}
        </button>
        <a href="/bg/mahni-dosadnoto/live" target="_blank" rel="noreferrer">
          Отвори екрана
        </a>
      </section>

      <section className="md-ops-section">
        <h2>ИИ статус</h2>
        <div className="md-ops-ai">
          <article>
            <h3>Анализ</h3>
            <p>
              {analysisReady ? `Завършен · ${initial.themes.filter((theme) => !theme.isAiWildcard).length} теми` : analysisRunning ? "Тече" : latestAnalysis?.status === "failed" ? "Необходимо е повторение" : "Още не е пускан"}
            </p>
            {failedAnalysis.length > 0 ? (
              <details>
                <summary>Предишен неуспешен опит · технически детайли</summary>
                {failedAnalysis.slice(0, 3).map((run) => (
                  <pre key={run.id}>
                    {run.errorCode ?? "failed"}
                    {run.errorMessage ? `\n${run.errorMessage}` : ""}
                  </pre>
                ))}
              </details>
            ) : null}
          </article>
          <article>
            <h3>Жури</h3>
            <p>
              {jury.succeeded} / {jury.total} готови
            </p>
            <ul className="md-ops-judges">
              {jury.judges.map((judge) => (
                <li key={judge.judge}>
                  <span>{JUDGE_BG[judge.judge]}</span>
                  <span>{judgeStatus(judge.status)}</span>
                </li>
              ))}
            </ul>
            {campaign.phase === "AI_JURY" && !jury.complete && primary?.id !== "retry-jury" ? (
              <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("retry-jury")}>
                Повтори неуспешните
              </button>
            ) : null}
            <details>
              <summary>Технически детайли</summary>
              {jury.judges.map((judge) => (
                <pre key={judge.judge}>
                  {judge.judge} · {judge.status}
                  {judge.errorCode ? `\n${judge.errorCode}` : ""}
                  {judge.errorMessage ? `\n${judge.errorMessage}` : ""}
                </pre>
              ))}
            </details>
          </article>
        </div>
      </section>

      <section className="md-ops-section">
        <h2>Участници</h2>
        <p className="md-ops-count">
          {filtered.length} от {initial.participants.length}
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

      <section className="md-ops-section">
        <h2>Организации за контакт</h2>
        {initial.winningOrganizations.length === 0 ? (
          <p className="md-ops-phase-bg">Ще се появи, когато има теми и класиране.</p>
        ) : (
          <div className="md-ops-winners">
            {initial.winningOrganizations.map((row) => (
              <article key={row.themeId} className="md-ops-winner">
                <p className="md-ops-kicker">Топ {row.rank}</p>
                <h3>{row.themeTitle}</h3>
                <table>
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
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="md-ops-section">
        <h2>Теми ({initial.themes.length})</h2>
        <ul className="md-ops-themes">
          {initial.themes.map((theme) => (
            <li key={theme.id}>
              <span>
                {theme.isAiWildcard ? "Допълнителна · " : ""}
                {theme.title}
              </span>
              <span>
                {theme.ideaCount} идеи · {theme.organizationCount} орг.
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="md-ops-demo">
        <h2>Демо / репетиция</h2>
        <p>Тези действия не са част от живото събитие. Пипат само демо записи.</p>
        <div className="md-ops-demo-actions">
          <button type="button" className="md-ops-btn" disabled={!!busy} onClick={() => ask("seed")}>
            Зареди демо данни
          </button>
          <button type="button" className="md-ops-btn danger" disabled={!!busy} onClick={() => ask("reset")}>
            Изчисти демо данните
          </button>
        </div>
      </section>

      <section className="md-ops-section md-ops-export">
        <h2>Експорт</h2>
        <button type="button" className="md-ops-btn" onClick={() => void mdExportCsv().then(setCsv)}>
          Генерирай CSV
        </button>
        {csv ? <textarea readOnly value={csv} /> : null}
      </section>
    </div>
  );
}

const ACTION_LABEL: Record<ActionId, string> = {
  collect: "Старт на събирането",
  "close-collect": "Затвори събирането",
  analysis: "Стартирай анализа",
  vote: "Отвори гласуването",
  final: "Финално отброяване",
  "close-vote": "Затвори гласуването",
  jury: "Стартирай журито",
  "retry-jury": "Повтори неуспешните",
  results: "Покажи резултата",
  closed: "Затвори събитието",
};

const actionRunners: Record<ActionId | "seed" | "reset", () => Promise<void>> = {
  collect: () => mdStartCollecting(),
  "close-collect": () => mdCloseCollection(),
  analysis: () => mdRunAnalysis(),
  vote: () => mdOpenVoting(),
  final: () => mdStartFinalCountdown(),
  "close-vote": () => mdCloseVoting(),
  jury: () => mdRunJury(),
  "retry-jury": () => mdRetryJury(),
  results: () => mdRevealResults(),
  closed: () => mdCloseEvent(),
  seed: () => mdSeedDemo(),
  reset: () => mdResetDemo(),
};

function needsConfirm(id: ActionId | "seed" | "reset"): boolean {
  return id === "closed" || id === "seed" || id === "reset" || id === "close-collect" || id === "close-vote" || id === "final";
}

function confirmCopy(id: ActionId | "seed" | "reset"): string {
  switch (id) {
    case "seed":
      return "Ще бъдат добавени демо участници и идеи, а фазата ще стане „Събиране“.";
    case "reset":
      return "Ще бъдат изтрити само демо записите. Кампанията трябва да е маркирана като демо.";
    case "close-collect":
      return "Събирането на идеи ще спре. Участниците няма да могат да добавят нови.";
    case "final":
      return "Това пуска финалното отброяване и след него гласуването се заключва.";
    case "close-vote":
      return "Гласуването ще бъде затворено и изборът на хората ще бъде запазен.";
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
  jury: JuryProgress,
): { id: ActionId; label: string; disabled?: boolean } | null {
  switch (phase) {
    case "DRAFT":
      return { id: "collect", label: ACTION_LABEL.collect };
    case "COLLECTING":
      return { id: "close-collect", label: ACTION_LABEL["close-collect"] };
    case "ANALYZING":
      if (analysisReady) return { id: "vote", label: ACTION_LABEL.vote };
      if (analysisRunning) return { id: "analysis", label: "Анализът тече", disabled: true };
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
