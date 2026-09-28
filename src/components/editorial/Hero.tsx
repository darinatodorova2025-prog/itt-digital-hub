import type { ReactNode } from "react";
import { Container } from "@/components/layout/Container";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";

export type HeroLayout = "split" | "stacked" | "editorial" | "overlay";

/**
 * Editorial hero.
 *  - "split":     statement + lead + actions left, visual right.
 *  - "stacked":   statement across, then lead/actions beside visual.
 *  - "editorial": statement, then lead/actions beside a proof panel.
 *  - "overlay":   full-bleed media with marine scrim and copy on top.
 */
export function Hero({
  headline,
  lead,
  support,
  primary,
  secondary,
  visual,
  layout = "split",
  label,
  caption,
  tone = "paper",
}: {
  headline: string;
  lead: string;
  /** Second paragraph under the lead. Omitted when empty. */
  support?: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
  visual?: ReactNode;
  layout?: HeroLayout;
  label?: string;
  caption?: ReactNode;
  /** Editorial band only — dark uses official navy, not a photo overlay. */
  tone?: "paper" | "dark";
}) {
  const overlay = layout === "overlay";
  const dark = tone === "dark";
  const actions = (
    <div className={cn("mt-9 flex flex-wrap gap-3", overlay && "mt-8")}>
      <ButtonLink href={primary.href} variant={overlay ? "on-dark-fill" : "primary"}>
        {primary.label}
      </ButtonLink>
      {secondary ? (
        <ButtonLink href={secondary.href} variant={overlay || dark ? "on-dark" : "secondary"} arrow={false}>
          {secondary.label}
        </ButtonLink>
      ) : null}
    </div>
  );

  if (overlay) {
    return (
      <section className="bg-marine text-on-dark" data-surface="dark">
        <div className="relative isolate min-h-[32rem] overflow-hidden md:min-h-[38rem] lg:min-h-[42rem]">
          {visual}
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-marine via-marine/82 to-marine/50 md:bg-gradient-to-r md:from-marine md:from-[32%] md:via-marine/70 md:to-marine/12"
            aria-hidden="true"
          />
          <Container className="hero-copy-in relative z-10 flex min-h-[32rem] flex-col justify-end pt-16 pb-14 md:min-h-[38rem] md:justify-center md:pt-20 md:pb-20 lg:min-h-[42rem]">
            {label ? <p className="label-dark">{label}</p> : null}
            <h1
              className={cn(
                "text-on-dark text-hero hyphens-none",
                headline.includes("\n")
                  ? "max-w-[42ch] whitespace-pre-line [text-wrap:wrap]"
                  : "max-w-[26ch] text-pretty",
                label && "mt-4",
              )}
            >
              {headline}
            </h1>
            <p className="mt-6 max-w-[46ch] text-lead text-on-dark-muted">{lead}</p>
            {actions}
          </Container>
        </div>
        {caption ? (
          <Container className="border-t border-on-dark/15 py-4">
            <div className="max-w-[72ch] text-small text-on-dark-muted">{caption}</div>
          </Container>
        ) : null}
      </section>
    );
  }

  if (layout === "editorial") {
    return (
      <section
        className={cn("relative isolate overflow-hidden", dark ? "hero-atmosphere text-on-dark" : "bg-paper")}
        data-surface={dark ? "dark" : undefined}
      >
        <Container className={cn(dark ? "flex min-h-[100svh] flex-col justify-start pt-28 pb-16 md:justify-center md:pt-32 md:pb-24" : "pt-16 pb-14 md:pt-24 md:pb-20")}>
          {label ? <p className={dark ? "label-dark" : "label"}>{label}</p> : null}
          <h1
            className={cn(
              "text-hero text-balance hyphens-none font-sans font-normal",
              dark ? "text-on-dark" : "text-ink",
              headline.includes("\n") ? "max-w-[20ch] whitespace-pre-line md:max-w-[38ch]" : "max-w-[18ch] md:max-w-[22ch]",
              label && "mt-5",
            )}
          >
            {headline}
          </h1>
          <div className="mt-10 grid items-end gap-10 lg:mt-16 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <p className={cn("max-w-[48ch] text-lead font-light", dark ? "text-on-dark-muted" : "text-ink-2")}>{lead}</p>
              {support ? (
                <p className={cn("mt-4 max-w-[48ch] text-small font-light", dark ? "text-on-dark-muted" : "text-ink-3")}>{support}</p>
              ) : null}
              {actions}
            </div>
            {visual ? <div className="lg:col-span-7">{visual}</div> : null}
          </div>
        </Container>
      </section>
    );
  }

  if (layout === "stacked") {
    return (
      <section className="bg-paper">
        <Container className="pt-14 pb-12 md:pt-20 md:pb-14 lg:pt-20 lg:pb-16">
          <h1 className="text-hero max-w-[30ch] text-pretty text-ink">{headline}</h1>
          <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-6 lg:pr-8">
              <p className="max-w-[58ch] text-lead text-ink-2">{lead}</p>
              {actions}
            </div>
            {visual ? <div className="lg:col-span-6 lg:-mt-2">{visual}</div> : null}
          </div>
        </Container>
      </section>
    );
  }

  return (
    <section className="bg-paper">
      <Container className="grid gap-12 pt-14 pb-16 md:pt-20 md:pb-20 lg:grid-cols-12 lg:gap-12 lg:pt-20 lg:pb-24">
        <div className={cn("lg:col-span-7 lg:pr-6")}>
          <h1 className="text-hero max-w-[26ch] text-pretty text-ink">{headline}</h1>
          <p className="mt-7 max-w-[58ch] text-lead text-ink-2">{lead}</p>
          {actions}
        </div>
        {visual ? <div className="lg:col-span-5 lg:self-center">{visual}</div> : null}
      </Container>
    </section>
  );
}
