import { classifyComparison, operationSuccessful, sourceCoverage, type OperationStatus } from "@/lib/analytics/operation";
import { readQuestionContext } from "@/lib/analytics/identity";
import { captureServerEvent } from "@/lib/analytics/server";
import { topicForQuestion } from "@/lib/analytics/topics";
import { addUsage, estimateCostUsd, type ModelUsage } from "@/lib/analytics/usage";

type Side = {
  ok: boolean;
  error?: string;
  latencyMs?: number;
  resolvedModel?: string | null;
  usage?: ModelUsage | null;
};

export async function recordAiComparison(
  request: Request,
  input: {
    toolId: "vik-proektant" | "ai-act-assistant";
    requestId: string;
    locale: "bg" | "en";
    exampleId: string | null;
    prompt: string;
    model: string;
    provider?: string;
    error?: string | null;
    durationMs?: number;
    control?: Side;
    expert?: Side;
    sourceCount?: number;
    retrievalUsed?: boolean;
    calculationPerformed?: boolean;
    fair?: boolean;
  },
): Promise<void> {
  const question = readQuestionContext(request.headers);
  const status: OperationStatus = classifyComparison({
    error: input.error,
    controlOk: input.control?.ok,
    expertOk: input.expert?.ok,
  });
  const usage = addUsage(input.control?.usage, input.expert?.usage);
  const sourceCount = input.sourceCount ?? 0;
  const expertOk = Boolean(input.expert?.ok);
  const resolved = resolvedModel(input.control?.resolvedModel, input.expert?.resolvedModel);
  try {
    await captureServerEvent(request.headers, "tool_operation_result", {
      tool_id: input.toolId,
      locale: input.locale,
      status,
      successful: operationSuccessful(status),
      fully_completed: status === "completed",
      confirmation: "server",
      request_id: input.requestId,
      mode: "comparison",
      follow_up: question.followUp,
      question_index: question.questionIndex,
      is_repeat: question.isRepeat,
      example_id: input.exampleId ?? "custom",
      topic_category: input.error ? undefined : topicForQuestion(input.toolId, input.prompt, input.exampleId),
      prompt_length: input.prompt.trim().length,
      provider: input.provider ?? "openai",
      model: input.model,
      resolved_model: resolved,
      fallback: false,
      control_ok: input.control?.ok ?? false,
      expert_ok: expertOk,
      control_error: input.control?.ok === false ? input.control.error ?? null : null,
      expert_error: input.expert?.ok === false ? input.expert.error ?? null : null,
      error_code: input.error ?? null,
      control_latency_ms: input.control?.latencyMs ?? null,
      expert_latency_ms: input.expert?.latencyMs ?? null,
      duration_ms: input.durationMs ?? null,
      latency_ms: input.durationMs ?? null,
      retrieval_used: Boolean(input.retrievalUsed),
      source_count: sourceCount,
      source_coverage: sourceCoverage(sourceCount, expertOk),
      calculation_performed: Boolean(input.calculationPerformed),
      fair: input.fair ?? null,
      input_tokens: usage?.inputTokens ?? null,
      output_tokens: usage?.outputTokens ?? null,
      total_tokens: usage?.totalTokens ?? null,
      estimated_cost_usd: estimateCostUsd(input.model, usage),
    });
  } catch {
    // ignore
  }
}

function resolvedModel(control: string | null | undefined, expert: string | null | undefined): string | null {
  if (control && expert && control !== expert) return "mixed";
  return control || expert || null;
}
