"use client";

import { useState } from "react";
import { combineButtonEnabled, extractButtonLabel, type LiveReviewItem } from "@/mahni-dosadnoto/review";

export function CombiningReview({
  items,
  notice,
  onExtract,
  onCombine,
}: {
  items: LiveReviewItem[];
  notice?: string;
  onExtract: (themeId: string, ideaIds: string[]) => Promise<{ openedId: string }>;
  onCombine: (themeIds: string[]) => Promise<{ openedId: string }>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [pickedTop, setPickedTop] = useState<string[]>([]);
  const [pickedRaw, setPickedRaw] = useState<string[]>([]);
  const [extractBusy, setExtractBusy] = useState(false);
  const [combineBusy, setCombineBusy] = useState(false);
  const [combineError, setCombineError] = useState("");
  const [extractError, setExtractError] = useState("");

  const itemIds = new Set(items.map((item) => item.id));
  const open = items.find((item) => item.id === openId) ?? null;
  const visibleTop = pickedTop.filter((id) => itemIds.has(id));
  const sourceIds = new Set(open?.sources.map((source) => source.id) ?? []);
  const visibleRaw = open ? pickedRaw.filter((id) => sourceIds.has(id)) : [];
  const combineOn = combineButtonEnabled(visibleTop.length) && !combineBusy && !extractBusy;
  const extractOn = visibleRaw.length > 0 && !extractBusy && !combineBusy && open !== null;

  function toggleTop(id: string) {
    setCombineError("");
    setPickedTop((current) => {
      const live = current.filter((item) => itemIds.has(item));
      return live.includes(id) ? live.filter((item) => item !== id) : [...live, id];
    });
  }

  function toggleRaw(id: string) {
    setExtractError("");
    setPickedRaw((current) => {
      const live = current.filter((item) => sourceIds.has(item));
      return live.includes(id) ? live.filter((item) => item !== id) : [...live, id];
    });
  }

  function openTheme(id: string) {
    setOpenId(id);
    setPickedRaw([]);
    setExtractError("");
  }

  async function extract() {
    if (!open || visibleRaw.length === 0) return;
    const themeId = open.id;
    const ideaIds = [...visibleRaw];
    setExtractBusy(true);
    setExtractError("");
    try {
      const result = await onExtract(themeId, ideaIds);
      setPickedRaw([]);
      setOpenId(result.openedId);
    } catch {
      setExtractError("Изваждането не мина. Изборът е запазен.");
    } finally {
      setExtractBusy(false);
    }
  }

  async function combine() {
    if (!combineButtonEnabled(visibleTop.length)) return;
    const themeIds = [...visibleTop];
    setCombineBusy(true);
    setCombineError("");
    try {
      const result = await onCombine(themeIds);
      setPickedTop((current) => current.filter((id) => !themeIds.includes(id)));
      setOpenId(result.openedId);
      setPickedRaw([]);
    } catch {
      setCombineError("Комбинирането не мина. Изборът е запазен.");
    } finally {
      setCombineBusy(false);
    }
  }

  return (
    <div className="md-review">
      {notice ? <p className="md-review-notice">{notice}</p> : null}
      <section className="md-review-zone" aria-label="Комбинирани идеи">
        <div className="md-review-zone-head">
          <h2>Комбинирани идеи</h2>
          <button type="button" className="md-review-action" disabled={!combineOn} aria-busy={combineBusy} onClick={() => void combine()}>
            {combineBusy ? "Комбинира…" : "Комбинирай"}
          </button>
        </div>
        {combineError ? <p className="md-review-error">{combineError}</p> : null}
        {items.length === 0 ? (
          <p className="md-review-empty">Все още няма комбинирани идеи.</p>
        ) : (
          <ul className="md-review-top">
            {items.map((item) => {
              const selected = visibleTop.includes(item.id);
              const isOpen = item.id === openId;
              return (
                <li key={item.id} className={isOpen ? "is-open" : undefined}>
                  <label className="md-review-check">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleTop(item.id)}
                      aria-label={`Избери „${item.title}“ за комбиниране`}
                    />
                  </label>
                  <button type="button" className="md-review-open" aria-expanded={isOpen} onClick={() => openTheme(item.id)}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.isAiWildcard ? "Допълнение от модела" : item.sources.length === 1 ? "1 идея" : `${item.sources.length} идеи`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="md-review-zone md-review-raw" aria-label="Подадени идеи">
        {open ? (
          <>
            <h2>{open.title}</h2>
            <p className="md-review-label">Как е формулирана</p>
            <p className="md-review-note">{open.formulationNote || "Няма записана бележка за формулировката."}</p>
            <p className="md-review-label">Подадени идеи</p>
            {open.sources.length === 0 ? (
              <p className="md-review-empty">Няма подадена идея. Формулировката е допълнение от модела.</p>
            ) : (
              <>
                <table className="md-review-table">
                  <tbody>
                    {open.sources.map((source) => (
                      <tr key={source.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={visibleRaw.includes(source.id)}
                            onChange={() => toggleRaw(source.id)}
                            aria-label="Избери идеята за изваждане"
                          />
                        </td>
                        <td>{source.body.trim() || "Текстът на идеята липсва в записа."}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="md-review-action" disabled={!extractOn} aria-busy={extractBusy} onClick={() => void extract()}>
                  {extractBusy ? "Изваждаме…" : extractButtonLabel(visibleRaw.length)}
                </button>
                {extractError ? <p className="md-review-error">{extractError}</p> : null}
              </>
            )}
          </>
        ) : (
          <p className="md-review-empty">Изберете комбинирана идея отгоре, за да се видят оригиналните текстове.</p>
        )}
      </section>
    </div>
  );
}
