"use client";

import { useState } from "react";
import type { Theme } from "@/mahni-dosadnoto/types";

export function AudienceReviewDesk({
  themes,
  busy,
  onApprove,
  onSplit,
  onOverride,
  onCombine,
}: {
  themes: Theme[];
  busy: boolean;
  onApprove: (themeId: string) => Promise<void>;
  onSplit: (themeId: string) => Promise<void>;
  onOverride: (themeId: string, reason: string) => Promise<void>;
  onCombine: (themeIds: string[]) => Promise<void>;
}) {
  const real = themes.filter((theme) => !theme.isAiWildcard);
  const current = real.find((theme) => theme.reviewStatus === "review_ready") ?? real.find((theme) => theme.reviewStatus === "audit_unavailable") ?? null;
  const [reason, setReason] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const approved = real.filter((theme) => theme.reviewStatus === "approved").length;

  async function run(action: () => Promise<void>, failure: string) {
    setMessage("");
    try {
      await action();
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      setMessage(
        code === "not_mergeable"
          ? "Тези идеи не описват един и същ проблем и остават отделни."
          : code === "split_failed"
            ? "Разделянето не завърши. Темата остава за нов опит."
            : failure,
      );
    }
  }

  return (
    <section className="md-ops-section" id="ops-review">
      <h2>Преглед от залата</h2>
      <p className="md-ops-note">ИИ ни помага да намерим общото между идеите. После проверяваме заедно дали сме ги подредили правилно.</p>
      <p className="md-ops-note">
        Одобрени {approved} от {real.length}. Само одобрените реални теми влизат в избора.
      </p>
      {current ? (
        <article className="md-ops-panel">
          <p className="md-ops-kicker">{current.reviewStatus === "audit_unavailable" ? "Одитът не е наличен" : "Текуща тема"}</p>
          <h3>{current.title}</h3>
          <p>{current.description}</p>
          <p className="md-ops-note">{current.formulationNote}</p>
          {current.audit?.summary ? <p className="md-ops-note">{current.audit.summary}</p> : null}
          {current.auditOverride ? <p className="md-ops-note">Продължено без одит: {current.auditOverride.reason}</p> : null}
          <ul>
            {(current.sourceIdeas ?? []).map((source) => (
              <li key={source.id}>{source.body}</li>
            ))}
          </ul>
          {current.reviewStatus === "audit_unavailable" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(() => onOverride(current.id, reason), "Решението не беше записано.");
              }}
            >
              <label>
                Изрично решение за продължаване без одит
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} minLength={8} required />
              </label>
              <button type="submit" className="md-ops-btn" disabled={busy || reason.trim().length < 8}>
                Запиши решението и пусни темата към залата
              </button>
            </form>
          ) : (
            <div className="md-ops-advanced-row">
              <button type="button" className="md-ops-primary" disabled={busy || current.reviewStatus !== "review_ready"} onClick={() => void run(() => onApprove(current.id), "Одобрението не беше записано.")}>
                ОДОБРЕНО ОТ ЗАЛАТА
              </button>
              <button type="button" className="md-ops-btn" disabled={busy || current.reviewStatus !== "review_ready"} onClick={() => void run(() => onSplit(current.id), "Разделянето не завърши.")}>
                ТРЯБВА ДА СЕ РАЗДЕЛИ
              </button>
            </div>
          )}
        </article>
      ) : (
        <p className="md-ops-note">{real.length === 0 ? "Няма теми за преглед." : "Всички реални теми са одобрени. Изборът може да се отвори."}</p>
      )}
      {message ? <p className="md-ops-error">{message}</p> : null}
      {real.length > 1 ? (
        <div>
          <p className="md-ops-kicker">Ръчно обединяване</p>
          <ul>
            {real.map((theme) => (
              <li key={theme.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={picked.includes(theme.id)}
                    onChange={() => setPicked((currentIds) => (currentIds.includes(theme.id) ? currentIds.filter((id) => id !== theme.id) : [...currentIds, theme.id]))}
                  />
                  {theme.title}
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="md-ops-btn"
            disabled={busy || picked.length < 2}
            onClick={() => void run(() => onCombine(picked), "Обединяването не завърши.")}
          >
            Провери дали са един проблем
          </button>
        </div>
      ) : null}
    </section>
  );
}
