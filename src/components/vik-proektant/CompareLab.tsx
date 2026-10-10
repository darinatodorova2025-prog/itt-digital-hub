"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { track } from "@vercel/analytics";
import { beginTrackedOperation, capture, captureFeature } from "@/lib/analytics/client";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { comparisonExamples, customScenarioGuide, scenarioGuides, vikProektant as copy, type ExampleId } from "@/content/vik-proektant";
import type { PublicCalculation, PublicSource, ToolKind } from "@/vik-proektant/comparison/presentation";
import { comparisonBand, isAnswerComparison, type AnswerComparison } from "@/vik-proektant/comparison/score";
import { AnswerMarkdown } from "@/components/vik-proektant/AnswerMarkdown";
import { Button } from "@/components/ui/ButtonLink";

type ErrorCode = "timeout" | "upstream" | "configuration" | "model_mismatch" | "empty" | "rate_limited" | "invalid_prompt";

type ControlResult = { ok: true; text: string } | { ok: false; error: ErrorCode };

type ExpertResult =
  | {
      ok: true;
      text: string;
      retrievalUsed?: boolean;
      calculationPerformed?: boolean;
      calculationInputRejected?: boolean;
      sources?: PublicSource[];
      calculations?: PublicCalculation[];
      toolKinds?: ToolKind[];
    }
  | { ok: false; error: ErrorCode };

type EvaluationState = null | { status: "loading" } | { status: "unavailable" } | { status: "ready"; comparison: AnswerComparison };

type Payload = {
  retryAfterMs?: number;
  fair: boolean;
  control: ControlResult;
  expert: ExpertResult;
  summary: {
    sourceCount: number;
    retrievalUsed: boolean;
    calculationPerformed: boolean;
    calculationInputRejected: boolean;
  };
  error?: ErrorCode;
};

export function CompareLab({ locale, modelLabel }: { locale: Locale; modelLabel: string }) {
  const text = copy.compare;
  const [prompt, setPrompt] = useState(comparisonExamples[0]?.prompt[locale] ?? "");
  const [exampleId, setExampleId] = useState<ExampleId | null>(comparisonExamples[0]?.id ?? null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ErrorCode | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const [result, setResult] = useState<Payload | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationState>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const evaluationGeneration = useRef(0);

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 220)}px`;
  }, [prompt]);

  function dropComparison() {
    evaluationGeneration.current += 1;
    setEvaluation(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const generation = evaluationGeneration.current + 1;
    evaluationGeneration.current = generation;
    setPending(true);
    setFormError(null);
    setRetryAfterMs(null);
    setResult(null);
    setEvaluation(null);
    const selected = exampleId && comparisonExamples.some((item) => item.id === exampleId && item.prompt[locale] === prompt) ? exampleId : null;
    track(selected ? "selected_example_prompt" : "custom_prompt_used", selected ? { example: selected } : {});
    track("comparison_started", { example: selected ?? "custom" });
    const tracked = beginTrackedOperation("vik-proektant", prompt, { locale, mode: "comparison", example_id: selected ?? "custom" });
    try {
      const response = await fetch("/api/vik-proektant/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tracked.headers },
        body: JSON.stringify({ prompt, locale, exampleId: selected }),
      });
      const body = (await response.json()) as Payload;
      if (!response.ok) {
        setFormError(body.error ?? "upstream");
        setRetryAfterMs(typeof body.retryAfterMs === "number" ? body.retryAfterMs : null);
        track(response.status === 429 ? "comparison_completed" : "comparison_completed", { status: "rejected" });
        return;
      }
      setResult(body);
      if (!body.control.ok) track("control_error", { error: body.control.error });
      if (!body.expert.ok) track("expert_error", { error: body.expert.error });
      if (body.expert.ok && body.summary.retrievalUsed) track("expert_used_retrieval", { sources: body.summary.sourceCount });
      if (body.expert.ok && body.summary.calculationPerformed) track("expert_used_calculation", {});
      track("comparison_completed", { fair: body.fair });
      if (body.control.ok && body.expert.ok) {
        setPending(false);
        await evaluateAnswers(generation, prompt, body.control.text, body.expert.text);
        return;
      }
    } catch {
      setFormError("upstream");
      track("comparison_completed", { status: "failed" });
      capture("tool_operation_result", {
        tool_id: "vik-proektant",
        locale,
        status: "failed",
        confirmation: "client",
        successful: false,
        fully_completed: false,
        error_code: "network",
        operation_id: tracked.operationId,
        mode: "comparison",
      });
    } finally {
      if (evaluationGeneration.current === generation) setPending(false);
    }
  }

  async function evaluateAnswers(generation: number, question: string, answerA: string, answerB: string) {
    if (evaluationGeneration.current !== generation) return;
    setEvaluation({ status: "loading" });
    try {
      const response = await fetch("/api/vik-proektant/compare/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, answerA, answerB }),
      });
      if (evaluationGeneration.current !== generation) return;
      const body = (await response.json()) as unknown;
      if (!response.ok || !isAnswerComparison(body)) {
        setEvaluation({ status: "unavailable" });
        captureFeature("vik-proektant", "comparison_scored", { locale, status: "failed" });
        return;
      }
      setEvaluation({ status: "ready", comparison: body });
      captureFeature("vik-proektant", "comparison_scored", { locale, status: "completed" });
    } catch {
      if (evaluationGeneration.current !== generation) return;
      setEvaluation({ status: "unavailable" });
      captureFeature("vik-proektant", "comparison_scored", { locale, status: "failed" });
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-line bg-white px-4 py-4 shadow-[0_16px_40px_rgba(4,14,49,0.06)] md:px-6 md:py-5">
      <form onSubmit={onSubmit}>
        <label htmlFor="vik-prompt" className="text-small font-medium text-ink">
          {text.promptLabel[locale]}
        </label>
        <textarea
          ref={fieldRef}
          id="vik-prompt"
          value={prompt}
          maxLength={4000}
          rows={2}
          onChange={(event) => {
            const next = event.target.value;
            if (next !== prompt) dropComparison();
            setPrompt(next);
            setExampleId(null);
          }}
          placeholder={text.promptPlaceholder[locale]}
          className="ph-mask mt-2 w-full resize-none overflow-hidden rounded-2xl border border-line bg-paper px-4 py-2.5 text-body text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        />
        <div className="mt-3">
          <p className="text-meta text-ink-3">{text.examples[locale]}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {comparisonExamples.map((example) => {
              const selected = exampleId === example.id;
              return (
                <button
                  key={example.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    const nextPrompt = example.prompt[locale];
                    if (example.id !== exampleId || nextPrompt !== prompt) dropComparison();
                    setExampleId(example.id);
                    setPrompt(nextPrompt);
                    captureFeature("vik-proektant", "example_selected", { locale, example_id: example.id });
                  }}
                  className={cn(
                    "relative min-h-11 rounded-xl border px-3 py-2 text-left text-small text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
                    selected ? "border-transparent bg-paper font-semibold" : "border-line bg-white hover:border-ink",
                  )}
                >
                  {selected ? (
                    <svg className="pointer-events-none absolute inset-0 size-full text-signal" aria-hidden="true">
                      <rect
                        x="1"
                        y="1"
                        width="calc(100% - 2px)"
                        height="calc(100% - 2px)"
                        rx="11"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="6 6"
                      />
                    </svg>
                  ) : null}
                  {example.title[locale]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-col items-start gap-4 lg:flex-row lg:items-start lg:gap-10">
          <div className="flex shrink-0 items-center gap-4">
            <Button type="submit" variant="primary" arrow disabled={pending || prompt.trim().length < 2}>
              {pending ? text.pending[locale] : text.submit[locale]}
            </Button>
            {pending ? <ThinkingDots /> : null}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-4 md:flex-row md:items-start md:gap-10">
            <ScenarioGuide locale={locale} exampleId={exampleId} />
            <ComparisonPanel locale={locale} evaluation={evaluation} />
          </div>
        </div>
        {formError ? (
          <p role="status" className="mt-3 max-w-[62ch] rounded-xl border border-line bg-paper px-4 py-3 text-small text-ink">
            {formMessage(locale, formError, retryAfterMs)}
          </p>
        ) : null}
      </form>

      {result && !result.fair ? <p className="mt-4 text-small text-ink-2">{text.unfair[locale]}</p> : null}

      <p className="mt-5 border-t border-line pt-4 text-meta text-ink-3">
        {text.fairnessModel[locale]} · {modelLabel} · {text.fairnessQuestion[locale]}
      </p>
      <div className="mt-3 grid min-h-[22rem] items-start gap-3 lg:min-h-[24rem] lg:grid-cols-2" aria-busy={pending}>
        <ResultCard locale={locale} title={text.controlTitle[locale]} note={text.controlNote[locale]} pending={pending} pendingLabel={text.controlWaiting[locale]}>
          {!pending && result?.control.ok ? <AnswerMarkdown text={result.control.text} mode="control" /> : null}
          {!pending && result && !result.control.ok ? <p>{text.errors[result.control.error][locale]}</p> : null}
        </ResultCard>
        <ResultCard locale={locale} title={text.expertTitle[locale]} note={text.expertNote[locale]} pending={pending} pendingLabel={text.expertWaiting[locale]}>
          {!pending && result?.expert.ok ? <ExpertAnswer locale={locale} result={result.expert} /> : null}
          {!pending && result && !result.expert.ok ? <p>{text.errors[result.expert.error][locale]}</p> : null}
        </ResultCard>
      </div>
      <p className="mt-4 text-meta text-ink-3">{text.disclosure[locale]}</p>
    </div>
  );
}

function ScenarioGuide({ locale, exampleId }: { locale: Locale; exampleId: ExampleId | null }) {
  const text = copy.compare;
  const guide = exampleId ? scenarioGuides[exampleId] : customScenarioGuide;
  const heading = guide.heading?.[locale] ?? text.guideHeading[locale];
  return (
    <aside className="min-w-0 md:max-w-[18rem] md:shrink-0" aria-live="polite">
      <p className="text-meta font-medium text-ink-2">{heading}</p>
      <ul className="mt-1 space-y-0.5 text-meta leading-snug text-ink-3">
        {guide.points.slice(0, 3).map((point) => (
          <li key={point.en}>{point[locale]}</li>
        ))}
      </ul>
    </aside>
  );
}

function ComparisonPanel({ locale, evaluation }: { locale: Locale; evaluation: EvaluationState }) {
  const text = copy.compare;
  if (!evaluation) return null;
  return (
    <section className="w-full min-w-0 md:w-[22rem] md:shrink-0" aria-live="polite">
      <h2 className="text-meta font-medium text-ink-2">{text.comparisonHeading[locale]}</h2>
      {evaluation.status === "loading" ? (
        <p role="status" className="mt-1 text-meta text-ink-3">
          {text.comparing[locale]}
        </p>
      ) : null}
      {evaluation.status === "unavailable" ? (
        <p role="status" className="mt-1 text-meta text-ink-3">
          {text.comparisonUnavailable[locale]}
        </p>
      ) : null}
      {evaluation.status === "ready" ? (
        <div className="mt-1.5 space-y-1.5 transition-opacity duration-300">
          <ScoreRail locale={locale} label={text.criteria.grounding[locale]} score={evaluation.comparison.grounding.score} />
          <ScoreRail locale={locale} label={text.criteria.discipline[locale]} score={evaluation.comparison.discipline.score} />
          <ScoreRail locale={locale} label={text.criteria.usefulness[locale]} score={evaluation.comparison.usefulness.score} />
        </div>
      ) : null}
    </section>
  );
}

function ScoreRail({ locale, label, score }: { locale: Locale; label: string; score: number }) {
  const text = copy.compare;
  const band = comparisonBand(score);
  const interpretation = text.bands[band][locale];
  const position = Math.min(100, Math.max(0, (score / 4) * 100));
  return (
    <div className="grid grid-cols-[minmax(6.5rem,9.5rem)_minmax(0,1fr)] items-center gap-3" title={interpretation}>
      <span className="text-meta leading-tight text-ink-2">{label}</span>
      <div className="relative h-4" role="img" aria-label={`${label}: ${interpretation}`}>
        <div
          className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #c94a42 0%, #d4654a 18%, #e6c04a 46%, #e6c04a 54%, #3f9670 82%, #1e6b58 100%)",
          }}
        />
        <span aria-hidden="true" className="absolute top-1/2 left-1/2 z-[1] h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink" />
        <span
          className="absolute top-1/2 z-[2] size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink"
          style={{ left: `${position}%` }}
        />
        <span className="sr-only">{interpretation}</span>
      </div>
    </div>
  );
}

function ResultCard({
  locale,
  title,
  note,
  pending,
  pendingLabel,
  children,
}: {
  locale: Locale;
  title: string;
  note?: string;
  pending: boolean;
  pendingLabel: string;
  children: ReactNode;
}) {
  const text = copy.compare;
  return (
    <article className="min-w-0 rounded-[1.25rem] border border-line bg-paper p-4 md:p-5">
      <h2 className="text-h4 text-pretty text-ink">{title}</h2>
      {note ? <p className="mt-1.5 text-meta text-ink-3">{note}</p> : null}
      <div className="mt-3 min-h-28 text-small text-ink-2">
        {pending ? (
          <div>
            <p>{pendingLabel}</p>
            <SkeletonLines />
          </div>
        ) : null}
        {!pending && !hasContent(children) ? (
          <div>
            <p className="sr-only">{text.idle[locale]}</p>
            <SkeletonLines />
          </div>
        ) : null}
        {!pending ? children : null}
      </div>
    </article>
  );
}

function ExpertAnswer({ locale, result }: { locale: Locale; result: Extract<ExpertResult, { ok: true }> }) {
  const text = copy.compare;
  const sources = result.sources ?? [];
  const calculations = (result.calculations ?? []).filter((item) => !item.rejected && item.results.length > 0);
  const rejected = (result.calculations ?? []).find((item) => item.rejected);
  const meta = expertMeta(locale, result, sources.length);
  return (
    <div>
      {meta ? <p className="text-meta text-ink-3">{meta}</p> : null}
      <div className="mt-4">
        <AnswerMarkdown text={result.text} mode="expert" />
      </div>
      {calculations.map((calculation, index) => (
        <CalculationBlock key={index} locale={locale} calculation={calculation} />
      ))}
      {rejected ? (
        <p className="mt-4 flex items-start gap-2 text-small text-ink-2">
          <InfoIcon />
          <span>{rejected.message || text.calculationRejected[locale]}</span>
        </p>
      ) : null}
      {sources.length > 0 ? <SourceBlock locale={locale} sources={sources} /> : null}
      {(result.toolKinds ?? []).length > 0 ? <ToolDetails locale={locale} kinds={result.toolKinds ?? []} /> : null}
    </div>
  );
}

function expertMeta(locale: Locale, result: Extract<ExpertResult, { ok: true }>, sourceCount: number): string {
  const text = copy.compare;
  const parts: string[] = [];
  if (sourceCount > 0) parts.push(sourceCount === 1 ? text.sourceOne[locale] : `${sourceCount} ${text.sourceMany[locale]}`);
  if (result.retrievalUsed) parts.push(text.retrieval[locale]);
  if (result.calculationPerformed) parts.push(text.calculation[locale]);
  return parts.join(" · ");
}

function formMessage(locale: Locale, error: ErrorCode, retryAfterMs: number | null): string {
  const text = copy.compare;
  if (error !== "rate_limited" || !retryAfterMs) return text.errors[error][locale];
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  if (locale === "bg") {
    return seconds < 60
      ? `${text.errors.rate_limited.bg} Опитайте отново след ${seconds} сек.`
      : `${text.errors.rate_limited.bg} Опитайте отново след ${Math.ceil(seconds / 60)} мин.`;
  }
  return seconds < 60
    ? `${text.errors.rate_limited.en} Try again in ${seconds} sec.`
    : `${text.errors.rate_limited.en} Try again in ${Math.ceil(seconds / 60)} min.`;
}

function SourceBlock({ locale, sources }: { locale: Locale; sources: PublicSource[] }) {
  const text = copy.compare;
  return (
    <details className="mt-5 border-t border-line pt-4">
      <summary className="flex cursor-pointer items-center gap-2 text-small font-medium text-ink">
        <DocumentIcon />
        {text.sourcesTitle[locale]} ({sources.length})
      </summary>
      <SourceList sources={sources} />
    </details>
  );
}

function SourceList({ sources }: { sources: PublicSource[] }) {
  return (
    <ol className="mt-3 space-y-3">
      {sources.map((source, index) => (
        <li key={`${source.title}-${index}`} className="text-small">
          <p className="text-ink">
            <span className="text-ink-3">[{index + 1}] </span>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-line-strong underline-offset-2"
                onClick={() => captureFeature("vik-proektant", "source_opened", { source_index: index + 1, source_title: sourceLabel(source) })}
              >
                {sourceLabel(source)}
              </a>
            ) : (
              sourceLabel(source)
            )}
          </p>
          {source.locators.map((locator) => (
            <p key={locator} className="text-meta text-ink-3">
              {locator}
            </p>
          ))}
          {source.dvReference && !source.title.includes(source.dvReference) && !source.locators.some((locator) => locator.includes(source.dvReference)) ? (
            <p className="text-meta text-ink-3">{source.dvReference}</p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function sourceLabel(source: PublicSource): string {
  if (source.number && !source.title.includes(source.number)) return `${source.title} · ${source.number}`;
  return source.title;
}

function CalculationBlock({ locale, calculation }: { locale: Locale; calculation: PublicCalculation }) {
  const text = copy.compare;
  const primary = calculation.results[0];
  const rest = calculation.results.slice(1);
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="flex items-center gap-2 text-small font-medium text-ink">
        <CalculatorIcon />
        {text.result[locale]}
      </h3>
      {calculation.inputs.length > 0 ? (
        <div className="mt-3">
          <p className="text-meta text-ink-3">{text.inputs[locale]}</p>
          <dl className="mt-2 space-y-1">
            {calculation.inputs.map((row) => (
              <div key={row.key} className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-small">
                <dt className="text-ink-2">{text.fields[row.key][locale]}</dt>
                <dd className="text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
      {primary ? (
        <div className="mt-4 rounded-2xl bg-paper px-4 py-3">
          <p className="flex items-center gap-2 text-meta text-ink-3">
            <CheckIcon />
            {text.calculated[locale]}
          </p>
          <p className="mt-1 text-body text-ink">
            {text.fields[primary.key][locale]}: {primary.value}
            {primary.unit ? ` ${primary.unit}` : ""}
          </p>
          {rest.length > 0 ? (
            <dl className="mt-2 space-y-1">
              {rest.map((row) => (
                <div key={row.key} className="flex flex-wrap justify-between gap-x-4 text-small">
                  <dt className="text-ink-2">{text.fields[row.key][locale]}</dt>
                  <dd className="text-ink">
                    {row.value}
                    {row.unit ? ` ${row.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ToolDetails({ locale, kinds }: { locale: Locale; kinds: ToolKind[] }) {
  const text = copy.compare;
  const labels: Record<ToolKind, string> = {
    retrieval: text.toolRetrieval[locale],
    reference: text.toolReference[locale],
    calculation: text.toolCalculation[locale],
  };
  return (
    <details className="mt-5">
      <summary className="cursor-pointer text-meta text-ink-3">{text.tools[locale]}</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-meta text-ink-3">
        {kinds.map((kind) => (
          <li key={kind}>{labels[kind]}</li>
        ))}
      </ul>
    </details>
  );
}

function ThinkingDots() {
  return (
    <span className="itt-thinking" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function SkeletonLines() {
  return (
    <div aria-hidden="true" className="mt-3 space-y-2">
      <div className="h-2.5 w-11/12 rounded-full bg-line" />
      <div className="h-2.5 w-full rounded-full bg-line/80" />
      <div className="h-2.5 w-2/3 rounded-full bg-line/70" />
    </div>
  );
}

function hasContent(children: ReactNode): boolean {
  if (children == null || children === false) return false;
  if (Array.isArray(children)) return children.some((child) => hasContent(child));
  return true;
}

function DocumentIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-ink-3">
      <path d="M4 2.5h5.5L12.5 5.5V13.5H4v-11Z" stroke="currentColor" strokeWidth="1.25" />
      <path d="M9.5 2.5V5.5H12.5M6 8.5h4M6 11h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CalculatorIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-ink-3">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5.5 5h5M5.5 8h1M8 8h1M10.5 8h1M5.5 10.5h1M8 10.5h1M10.5 10.5h1" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
      <path d="m3.5 8.5 3 3 6-6.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 shrink-0 text-ink-3">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 7.2V11M8 5.2h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}
