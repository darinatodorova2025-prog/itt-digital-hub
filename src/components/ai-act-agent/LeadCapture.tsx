"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type HTMLAttributes } from "react";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/cn";
import { aiActAgent as copy } from "@/content/ai-act-agent";
import { postAgent, type AiActPlatformState } from "@/lib/agent-platform/client";
import { leadFieldLimits } from "@/lib/ai-act/lead";
import { applyLeadToSession } from "@/lib/ai-act/session";
import type { AiActJourney } from "@/lib/ai-act/types";
import { trackAiActEvent } from "@/lib/ai-act/analytics";
import { Button } from "@/components/ui/ButtonLink";
import { useAiActSession } from "./AiActSessionProvider";

const controlClass =
  "w-full bg-transparent font-sans text-base leading-normal text-ink outline-none placeholder:text-ink-3 md:text-small";

function Field({
  label,
  name,
  required,
  type = "text",
  autoComplete,
  maxLength,
  inputMode,
  defaultValue,
  variant = "line",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  maxLength: number;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  defaultValue?: string;
  variant?: "line" | "box";
}) {
  const id = useId();
  if (variant === "box") {
    return (
      <div className="rounded-xl border border-line bg-white px-4 py-2.5 transition-colors duration-150 focus-within:border-signal">
        <label htmlFor={id} className="text-meta uppercase tracking-[0.06em] text-ink-3">
          {label}
        </label>
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          inputMode={inputMode}
          defaultValue={defaultValue}
          className={cn(controlClass, "h-9")}
        />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 border-b border-line pb-1 transition-colors duration-150 focus-within:border-signal">
      <label htmlFor={id} className="text-meta text-ink-3">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={maxLength}
        inputMode={inputMode}
        defaultValue={defaultValue}
        className={cn(controlClass, "h-11 md:h-8")}
      />
    </div>
  );
}

export function LeadCapture({
  locale,
  reason,
  onCompleted,
  variant = "default",
}: {
  locale: Locale;
  reason: "chat" | "download";
  onCompleted?: () => void;
  variant?: "default" | "panel";
}) {
  const { session, update, ensure } = useAiActSession();
  const [status, setStatus] = useState<"idle" | "pending" | "invalid" | "error">("idle");
  useLeadGateViewed(!session.leadCaptured);

  const title = reason === "chat" ? copy.lead.chatTitle[locale] : copy.lead.downloadTitle[locale];
  const body = reason === "chat" ? copy.lead.chatBody[locale] : copy.lead.downloadBody[locale];

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending") return;
    const live = ensure();
    const form = new FormData(event.currentTarget);
    const payload = {
      website: String(form.get("website") ?? ""),
      name: String(form.get("name") ?? ""),
      workEmail: String(form.get("workEmail") ?? ""),
      company: String(form.get("company") ?? ""),
      role: String(form.get("role") ?? ""),
      marketingConsent: form.get("marketingConsent") === "on",
      locale,
      anonymousSessionId: live.anonymousSessionId,
      journey: (live.journey ?? (reason === "download" ? "build" : "use")) as AiActJourney,
      source: live.source,
      campaign: live.campaign,
    };

    setStatus("pending");
    try {
      const response = await postAgent("/v1/agents/ai-act/actions/lead", {
        locale,
        sessionId: live.anonymousSessionId,
        input: payload,
        ...(live.gateToken ? { clientState: { gate: live.gateToken } } : {}),
      });
      const data = (await response.json()) as { result?: { persisted?: boolean }; state?: AiActPlatformState };
      if (!response.ok || data.result?.persisted === false) {
        setStatus(response.status === 400 ? "invalid" : "error");
        return;
      }
      update((current) => ({
        ...applyLeadToSession(current, {
          name: payload.name.trim(),
          workEmail: payload.workEmail.trim(),
          company: payload.company.trim(),
          role: payload.role.trim(),
          marketingConsent: payload.marketingConsent,
        }),
        ...(data.state?.gate ? { gateToken: data.state.gate } : {}),
      }));
      trackAiActEvent("ai_act_lead_submitted", { locale, reason, persisted: true });
      setStatus("idle");
      onCompleted?.();
    } catch {
      setStatus("error");
    }
  }

  const boxed = variant === "panel";
  const fieldVariant = boxed ? "box" : "line";

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      onInput={() => {
        if (status === "invalid" || status === "error") setStatus("idle");
      }}
      className={cn("ph-mask relative", boxed ? "rounded-[1.25rem] bg-white p-6 md:p-8" : "surface-card")}
      noValidate
    >
      {boxed ? null : (
        <>
          <h2 className="text-h3 text-ink">{title}</h2>
          <p className="mt-2 max-w-[54ch] text-small text-ink-2">{body}</p>
        </>
      )}

      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={cn("relative grid gap-4", boxed ? undefined : "mt-6 gap-5")}>
        <Field label={copy.lead.name[locale]} name="name" required autoComplete="name" maxLength={leadFieldLimits.name} defaultValue={session.name} variant={fieldVariant} />
        <Field
          label={copy.lead.email[locale]}
          name="workEmail"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          maxLength={leadFieldLimits.workEmail}
          defaultValue={session.workEmail}
          variant={fieldVariant}
        />
        <Field
          label={copy.lead.company[locale]}
          name="company"
          required
          autoComplete="organization"
          maxLength={leadFieldLimits.company}
          defaultValue={session.company}
          variant={fieldVariant}
        />
        <Field
          label={copy.lead.role[locale]}
          name="role"
          required
          autoComplete="organization-title"
          maxLength={leadFieldLimits.role}
          defaultValue={session.role}
          variant={fieldVariant}
        />
        <label className="flex items-start gap-3 text-small text-ink-2">
          <input type="checkbox" name="marketingConsent" defaultChecked={session.marketingConsent} className="mt-1 size-4 shrink-0 accent-signal" />
          <span>{copy.lead.consent[locale]}</span>
        </label>
      </div>

      <div className="mt-8 flex flex-col items-start gap-3">
        <Button type="submit" disabled={status === "pending"} className="min-h-11">
          {status === "pending" ? copy.lead.submitting[locale] : copy.lead.submit[locale]}
        </Button>
        {status === "invalid" ? (
          <p className="text-small text-ink-2" role="alert">
            {copy.lead.invalid[locale]}
          </p>
        ) : null}
        {status === "error" ? (
          <p className="text-small text-ink-2" role="alert">
            {copy.lead.error[locale]}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function useLeadGateViewed(active: boolean): void {
  const seen = useRef(false);
  useEffect(() => {
    if (!active || seen.current) return;
    seen.current = true;
    trackAiActEvent("ai_act_lead_gate_viewed");
  }, [active]);
}
