"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { captureServerEvent } from "@/lib/analytics/server";
import { formatContactMessage, parseContactForm } from "@/lib/contact";

export type ContactActionState = {
  status: "idle" | "ok" | "invalid" | "error";
};

/** Confirmed enquiry inbox. Not shown on the public page. */
const CONTACT_INBOX = "i.t.todorov83@gmail.com";
const DEFAULT_FROM = "ITT Digital Hub <noreply@mail.ittdigitalhub.uk>";

const windowMs = 60 * 60 * 1000;
const maxPerWindow = 5;
const hits = new Map<string, number[]>();

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

async function rateLimited(): Promise<boolean> {
  const now = Date.now();
  const key = await clientKey();
  const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
  if (recent.length >= maxPerWindow) {
    hits.set(key, recent);
    return true;
  }
  recent.push(now);
  hits.set(key, recent);
  return false;
}

function deliveryConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function inbox(): string {
  return process.env.CONTACT_TO_EMAIL?.trim() || CONTACT_INBOX;
}

function fromAddress(): string {
  return process.env.CONTACT_FROM_EMAIL?.trim() || DEFAULT_FROM;
}

async function deliver(text: string, name: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const to = inbox();
  const idempotencyKey = `contact-enquiry/${createHash("sha256").update(text).digest("hex").slice(0, 32)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      reply_to: [CONTACT_INBOX],
      subject: `ITT enquiry: ${name.slice(0, 80)}`,
      text,
    }),
  });

  if (response.ok) return true;
  const detail = await response.text().catch(() => "");
  console.error(`[contact form] Resend ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}`);
  return false;
}

export async function submitContact(_prev: ContactActionState, formData: FormData): Promise<ContactActionState> {
  const parsed = parseContactForm(formData);
  if (parsed.kind === "spam") return { status: "ok" };
  if (parsed.kind === "invalid") return { status: "invalid" };
  if (await rateLimited()) return { status: "error" };

  const text = formatContactMessage(parsed.data);
  if (!deliveryConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.error("[contact form] RESEND_API_KEY is not set");
      return { status: "error" };
    }
    console.info("[contact form]", text);
    return { status: "ok" };
  }

  const sent = await deliver(text, parsed.data.name);
  if (sent) {
    const headerList = await headers();
    await captureServerEvent(headerList, "contact_submitted", {
      locale: parsed.data.locale,
      status: "ok",
      confirmation: "server",
      surface: "work-with-us",
    });
  }
  return { status: sent ? "ok" : "error" };
}
