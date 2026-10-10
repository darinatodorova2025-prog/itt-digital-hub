export const AI_ACT_EVENTS = [
  "ai_act_page_view",
  "ai_act_path_selected",
  "ai_act_question_started",
  "ai_act_lead_gate_viewed",
  "ai_act_lead_submitted",
  "ai_act_build_step_viewed",
  "ai_act_kit_download_clicked",
  "ai_act_installer_prompt_copied",
  "ai_act_test_copied",
  "ai_act_contact_clicked",
  "ai_act_artifact_collected",
] as const;

export type AiActEvent = (typeof AI_ACT_EVENTS)[number];

export type AiActEventPayload = Record<string, string | number | boolean | null>;

/**
 * Thin boundary over the site's existing Vercel Analytics.
 * Safe to call from client components; ignores failures.
 */
export function trackAiActEvent(event: AiActEvent, payload?: AiActEventPayload): void {
  void import("@vercel/analytics")
    .then(({ track }) => {
      track(event, payload);
    })
    .catch(() => undefined);
  void import("@/lib/analytics/client")
    .then(({ capture }) => {
      capture(event, { tool_id: "ai-act-agent", ...payload });
    })
    .catch(() => undefined);
}
