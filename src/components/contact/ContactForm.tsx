"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { cn } from "@/lib/cn";
import { contactForm as copy } from "@/content/pages";
import { contactFieldLimits } from "@/lib/contact";
import { submitContact, type ContactActionState } from "@/app/contact/actions";
import { Button } from "@/components/ui/ButtonLink";

const initial: ContactActionState = { status: "idle" };

const controlClass =
  "w-full bg-transparent font-sans text-small leading-normal text-ink outline-none placeholder:text-ink-3";

function Field({
  label,
  name,
  required,
  type = "text",
  autoComplete,
  multiline,
  maxLength,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  maxLength: number;
  placeholder?: string;
}) {
  const id = `contact-${name}`;
  return (
    <div
      className={cn(
        "border-b border-line transition-colors duration-150 focus-within:border-signal",
        multiline ? "flex flex-col gap-2 pb-3" : "flex flex-col gap-1 pb-1",
      )}
    >
      <label htmlFor={id} className="text-meta text-ink-3">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          required={required}
          rows={6}
          maxLength={maxLength}
          placeholder={placeholder}
          className={cn(controlClass, "min-h-36 resize-none")}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          required={required}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={cn(controlClass, "h-8")}
        />
      )}
    </div>
  );
}

export function ContactForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(submitContact, initial);
  const message =
    state.status === "ok"
      ? copy.success[locale]
      : state.status === "invalid"
        ? copy.invalid[locale]
        : state.status === "error"
          ? copy.error[locale]
          : null;

  return (
    <form action={action} className="ph-mask relative mt-12">
      <input type="hidden" name="locale" value={locale} />
      <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {state.status === "ok" ? (
        <p className="surface-card text-small text-ink" role="status">
          {copy.success[locale]}
        </p>
      ) : (
        <div className="surface-card grid gap-5">
          <Field label={copy.name[locale]} name="name" required autoComplete="name" maxLength={contactFieldLimits.name} />
          <Field label={copy.company[locale]} name="company" autoComplete="organization" maxLength={contactFieldLimits.company} />
          <Field
            label={copy.phone[locale]}
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={contactFieldLimits.phone}
          />
          <Field
            label={copy.problem[locale]}
            name="problem"
            required
            multiline
            maxLength={contactFieldLimits.problem}
            placeholder={copy.problemPlaceholder[locale]}
          />
        </div>
      )}

      {state.status === "ok" ? null : (
        <div className="mt-10 flex flex-col items-start gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? copy.sending[locale] : copy.send[locale]}
          </Button>
          {message && state.status !== "idle" ? (
            <p className="text-small text-ink-2" role="alert">
              {message}
            </p>
          ) : (
            <p className="max-w-[46ch] text-meta text-ink-3">
              {copy.privacy[locale]}{" "}
              <Link href={href(locale, "privacy")} className="link-quiet">
                {locale === "bg" ? "Поверителност" : "Privacy"}
              </Link>
            </p>
          )}
        </div>
      )}
    </form>
  );
}
