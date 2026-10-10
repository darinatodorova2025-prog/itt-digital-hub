"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { track } from "@vercel/analytics";
import { beginTrackedOperation, capture, captureFeature } from "@/lib/analytics/client";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { aiAct as copy, comparisonExamples, type ExampleId } from "@/content/ai-act";
import { expertStatusLine, type PublicSource, type ToolKind } from "@/ai-act/comparison/presentation";
import { AnswerMarkdown } from "@/components/vik-proektant/AnswerMarkdown";
import { Button } from "@/components/ui/ButtonLink";

type ErrorCode = "timeout" | "upstream" | "configuration" | "model_mismatch" | "empty" | "rate_limited" | "invalid_prompt";

type ControlResult = { ok: true; text: string } | { ok: false; error: ErrorCode };

type ExpertResult =
  | { ok: true; text: string; retrievalUsed?: boolean; sources?: PublicSource[]; toolKinds?: ToolKind[] }
  | { ok: false; error: ErrorCode };

type Payload = {
  retryAfterMs?: number;
  fair: boolean;
  control: ControlResult;
  expert: ExpertResult;
  summary: { sourceCount: number; retrievalUsed: boolean };
  error?: ErrorCode;
};

export function CompareLab({ locale }: { locale: Locale }) {
  const text = copy.compare;
  const [prompt, setPrompt] = useState(comparisonExamples[0]?.prompt[locale] ?? "");
  const [exampleId, setExampleId] = useState<ExampleId | null>(comparisonExamples[0]?.id ?? null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ErrorCode | null>(null);
  const [retryAfterMs, setRetryAfterMs] = useState<number | null>(null);
  const [result, setResult] = useState<Payload | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, 220)}px`;
  }, [prompt]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setFormError(null);
    setRetryAfterMs(null);
    setResult(null);
    const selected = exampleId && comparisonExamples.some((item) => item.id === exampleId && item.prompt[locale] === prompt) ? exampleId : null;
    track(selected ? "ai_act_example_prompt" : "ai_act_custom_prompt", selected ? { example: selected } : {});
    const tracked = beginTrackedOperation("ai-act-assistant", prompt, { locale, mode: "comparison", example_id: selected ?? "custom" });
    try {
      const response = await fetch("/api/ai-act/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...tracked.headers },
        body: JSON.stringify({ prompt, locale, exampleId: selected }),
      });
      const body = (await response.json()) as Payload;
      if (!response.ok) {
        setFormError(body.error ?? "upstream");
        setRetryAfterMs(typeof body.retryAfterMs === "number" ? body.retryAfterMs : null);
        return;
      }
      setResult(body);
    } catch {
      setFormError("upstream");
      capture("tool_operation_result", {
        tool_id: "ai-act-assistant",
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
      setPending(false);
    }
  }

  return (
    <div className="rounded-[1.5rem] border border-line bg-white px-4 py-4 shadow-[0_16px_40px_rgba(4,14,49,0.06)] md:px-6 md:py-5">
      <form onSubmit={onSubmit}>
        <label htmlFor="ai-act-prompt" className="text-small font-medium text-ink">
          {text.promptLabel[locale]}
        </label>
        <textarea
          ref={fieldRef}
          id="ai-act-prompt"
          value={prompt}
          maxLength={4000}
          rows={2}
          onChange={(event) => {
            setPrompt(event.target.value);
            setExampleId(null);
          }}
          placeholder={text.promptPlaceholder[locale]}
          className="ph-mask mt-2 w-full resize-none overflow-hidden rounded-2xl border border-line bg-paper px-4 py-2.5 text-body text-ink outline-none focus-visible:border-signal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal"
        />
        <div className="mt-3">
          <p id="ai-act-examples" className="text-meta text-ink-3">
            {text.examples[locale]}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-labelledby="ai-act-examples">
            {comparisonExamples.map((example) => {
              const selected = exampleId === example.id;
              return (
                <button
                  key={example.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setExampleId(example.id);
                    setPrompt(example.prompt[locale]);
                    captureFeature("ai-act-assistant", "example_selected", { locale, example_id: example.id });
                  }}
                  className={cn(
                    "relative min-h-11 rounded-xl border px-3 py-2 text-left text-small text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal",
                    selected ? "border-transparent bg-paper font-semibold" : "border-line bg-white hover:border-ink",
                  )}
                >
                  {selected ? (
                    <svg className="pointer-events-none absolute inset-0 size-full text-signal" aria-hidden="true">
                      <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
                    </svg>
                  ) : null}
                  {example.title[locale]}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <Button type="submit" variant="primary" arrow disabled={pending || prompt.trim().length < 2}>
            {pending ? text.pending[locale] : text.submit[locale]}
          </Button>
          {pending ? <ThinkingDots /> : null}
        </div>
        {formError ? (
          <p role="status" className="mt-3 max-w-[62ch] rounded-xl border border-line bg-paper px-4 py-3 text-small text-ink">
            {formMessage(locale, formError, retryAfterMs)}
          </p>
        ) : null}
      </form>

      {result && !result.fair ? <p className="mt-4 text-small text-ink-2">{text.unfair[locale]}</p> : null}

      <p className="mt-5 border-t border-line pt-4 text-meta text-ink-3">{text.fairness[locale]}</p>
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2" aria-busy={pending}>
        <ResultCard locale={locale} title={text.controlTitle[locale]} note={text.controlNote[locale]} pending={pending} pendingLabel={text.controlWaiting[locale]}>
          {!pending && result?.control.ok ? <AnswerMarkdown text={result.control.text} mode="control" /> : null}
          {!pending && result && !result.control.ok ? <p>{text.errors[result.control.error][locale]}</p> : null}
        </ResultCard>
        <ResultCard locale={locale} title={text.expertTitle[locale]} note={text.expertNote[locale]} pending={pending} pendingLabel={text.expertWaiting[locale]}>
          {!pending && result?.expert.ok ? <ExpertAnswer locale={locale} result={result.expert} /> : null}
          {!pending && result && !result.expert.ok ? <p>{text.errors[result.expert.error][locale]}</p> : null}
        </ResultCard>
      </div>
      <p className="mt-4 max-w-[65ch] text-meta text-ink-3">{text.disclosure[locale]}</p>
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
  const sources = result.sources ?? [];
  const meta = expertMeta(locale, result, sources.length);
  return (
    <div>
      {meta ? <p className="text-meta text-ink-3">{meta}</p> : null}
      <div className={meta ? "mt-4" : undefined}>
        <AnswerMarkdown text={result.text} mode="expert" />
      </div>
      {sources.length > 0 ? <SourceBlock locale={locale} sources={sources} /> : null}
      {(result.toolKinds ?? []).length > 0 ? <ToolDetails locale={locale} kinds={result.toolKinds ?? []} /> : null}
    </div>
  );
}

function expertMeta(locale: Locale, result: Extract<ExpertResult, { ok: true }>, sourceCount: number): string {
  return expertStatusLine(locale, sourceCount, Boolean(result.retrievalUsed));
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
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-small font-medium text-ink">
        <DocumentIcon />
        {text.sourcesTitle[locale]} ({sources.length})
      </summary>
      <ol className="mt-3 space-y-3">
        {sources.map((source, index) => (
          <li key={`${source.title}-${source.article ?? "x"}-${source.kind}`} className="min-w-0 text-small">
            <p className="break-words text-ink">
              <span className="text-ink-3">[{index + 1}] </span>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-line-strong underline-offset-2"
                  onClick={() => captureFeature("ai-act-assistant", "source_opened", { source_index: index + 1, source_title: source.title })}
                >
                  {source.title}
                </a>
              ) : (
                source.title
              )}
            </p>
            {source.locator ? <p className="mt-1 break-words text-meta text-ink-3">{source.locator}</p> : null}
            <p className="mt-1 break-words text-meta text-ink-3">{sourceMeta(locale, source)}</p>
          </li>
        ))}
      </ol>
    </details>
  );
}

function sourceMeta(locale: Locale, source: PublicSource): string {
  const text = copy.compare;
  const kind =
    source.kind === "law"
      ? text.kindLaw[locale]
      : source.kind === "guidance"
        ? text.kindGuidance[locale]
        : source.kind === "engineering"
          ? text.kindEngineering[locale]
          : text.kindNote[locale];
  return [kind, source.authority, source.version].filter(Boolean).join(" · ");
}

function ToolDetails({ locale, kinds }: { locale: Locale; kinds: ToolKind[] }) {
  const text = copy.compare;
  const labels: Record<ToolKind, string> = {
    retrieval: text.toolRetrieval[locale],
    reference: text.toolReference[locale],
    catalogue: text.toolCatalogue[locale],
  };
  return (
    <details className="mt-4">
      <summary className="min-h-11 cursor-pointer text-meta text-ink-3">{text.tools[locale]}</summary>
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
