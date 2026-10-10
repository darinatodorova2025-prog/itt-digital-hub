const REJECTED = /^(anonymous|user|null|undefined)$/i;

export type AnalyticsIdentity = {
  distinctId: string;
  sessionId: string | null;
  operationId: string | null;
  correlated: boolean;
};

type HeaderSource = { get(name: string): string | null };

export function readAnalyticsContext(headers: HeaderSource, fallbackId: string): AnalyticsIdentity {
  const distinctId = cleanAnalyticsId(headers.get("x-posthog-distinct-id"));
  const sessionId = cleanAnalyticsId(headers.get("x-posthog-session-id"));
  const operationId = cleanAnalyticsId(headers.get("x-itt-operation-id"));
  if (distinctId) return { distinctId, sessionId, operationId, correlated: true };
  return {
    distinctId: `srv_${operationId ?? fallbackId}`,
    sessionId,
    operationId,
    correlated: false,
  };
}

export type QuestionContext = {
  questionIndex: number | null;
  followUp: boolean;
  isRepeat: boolean;
};

export function readQuestionContext(headers: HeaderSource): QuestionContext {
  const raw = headers.get("x-itt-question-index");
  const parsed = raw && /^\d{1,4}$/.test(raw) ? Number(raw) : null;
  const questionIndex = parsed !== null && parsed > 0 ? parsed : null;
  return {
    questionIndex,
    followUp: headers.get("x-itt-follow-up") === "1",
    isRepeat: headers.get("x-itt-repeat") === "1",
  };
}

export function cleanAnalyticsId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return null;
  if (REJECTED.test(trimmed)) return null;
  if (/[@\s/\\]/.test(trimmed)) return null;
  return trimmed;
}
