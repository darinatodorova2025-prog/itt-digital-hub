import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { cn } from "@/lib/cn";

/** Internal page opening: optional back, mono label, serif h1, lead; optional aside on the right. */
export function PageHeader({
  back,
  label,
  heading,
  lead,
  support,
  aside,
  className,
  tone = "paper",
}: {
  back?: ReactNode;
  label?: string;
  heading: string;
  lead?: ReactNode;
  /** Extra paragraph under the lead. Used when a page has a second idea, not a new section. */
  support?: string;
  aside?: ReactNode;
  className?: string;
  /** "dark" expects a dark atmosphere on the parent (e.g. hero-atmosphere). */
  tone?: "paper" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <header className={cn(dark ? "text-on-dark" : "bg-paper", className)}>
      <Container className="grid gap-10 pt-12 pb-12 md:pt-16 md:pb-14 lg:grid-cols-12 lg:gap-12">
        <div className={aside ? "lg:col-span-8" : "lg:col-span-12"}>
          {back ? <div className="mb-6">{back}</div> : null}
          {label ? <p className={cn(dark ? "label-dark" : "label", "mb-5")}>{label}</p> : null}
          <h1 className={cn("text-h1", dark ? "text-on-dark" : "text-ink", heading.includes("\n") ? "whitespace-pre-line hyphens-none [text-wrap:wrap]" : "text-pretty")}>{heading}</h1>
          {lead ? <p className={cn("mt-7 max-w-[62ch] text-lead", dark ? "text-on-dark-muted" : "text-ink-2")}>{lead}</p> : null}
          {support ? <p className={cn("mt-4 max-w-[62ch] text-body", dark ? "text-on-dark-muted" : "text-ink-2")}>{support}</p> : null}
        </div>
        {aside ? <div className="lg:col-span-4 lg:pt-10">{aside}</div> : null}
      </Container>
    </header>
  );
}
