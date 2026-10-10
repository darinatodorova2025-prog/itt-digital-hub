"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ToolItem } from "@/content/tools";
import { capture, captureOnce } from "@/lib/analytics/client";
import { ArrowRight } from "@/components/ui/Icons";
import { BetaBadge } from "@/components/ui/BetaBadge";
import { cn } from "@/lib/cn";

function Cover({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={src.endsWith(".svg")}
      sizes="(min-width: 1024px) 44vw, 100vw"
      className="tool-card-image object-cover object-top"
    />
  );
}

export function ToolCard({ tool, openLabel, tone = "paper" }: { tool: ToolItem; openLabel: string; tone?: "paper" | "dark" }) {
  const frameRef = useRef<HTMLElement>(null);
  const live = Boolean(tool.href);

  useEffect(() => {
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      captureOnce(`card:${tool.id}`, "tool_card_seen", { tool_id: tool.id });
      observer.disconnect();
    }, { threshold: 0.45 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [tool.id]);
  const dark = tone === "dark";
  const body = (
    <>
      <div className={cn("relative aspect-[16/9] overflow-hidden", dark ? "bg-marine-2" : "bg-paper-2")}>
        <Cover src={tool.image} alt={tool.imageAlt} />
      </div>
      <div className="flex flex-1 flex-col px-6 py-5 md:px-7 md:py-6">
        <p className={dark ? "label-dark" : "label"}>{tool.category}</p>
        <h2 className={cn("mt-2 text-h3 text-pretty", dark ? "text-on-dark" : "text-ink")}>
          {tool.title}
          {tool.beta ? <BetaBadge size="compact" className="relative -top-[3px] ml-2 align-middle" /> : null}
        </h2>
        <p className={cn("mt-2 line-clamp-3 min-h-[4.5em] text-small", dark ? "text-on-dark-muted" : "text-ink-2")}>{tool.description}</p>
        <p className="mt-auto pt-5">
          {live ? (
            <span className={cn("inline-flex items-center gap-2 font-sans text-small font-medium", dark ? "text-on-dark" : "text-ink")}>
              {openLabel}
              <ArrowRight className="tool-card-arrow shrink-0" />
            </span>
          ) : (
            <span className={cn("text-small", dark ? "text-on-dark-muted" : "text-ink-3")}>{tool.status}</span>
          )}
        </p>
      </div>
    </>
  );

  const frame = dark
    ? "flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-on-dark/15 bg-white/5 backdrop-blur-sm"
    : "flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white";

  if (tool.href) {
    return (
      <article ref={frameRef} className="h-full">
        <Link
          href={tool.href}
          target={tool.external ? "_blank" : undefined}
          rel={tool.external ? "noreferrer" : undefined}
          className={cn("tool-card group no-underline outline-offset-4", dark ? "text-on-dark" : "text-ink", frame)}
          onClick={() => capture("tool_card_clicked", { tool_id: tool.id })}
        >
          {body}
        </Link>
      </article>
    );
  }

  return <article ref={frameRef} className={cn(frame, "cursor-default")}>{body}</article>;
}
