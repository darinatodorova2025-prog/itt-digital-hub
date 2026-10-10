"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { locales, type Locale, localeLabels } from "@/lib/i18n";
import { switchLocalePath } from "@/lib/paths";
import { cn } from "@/lib/cn";
import { capture } from "@/lib/analytics/client";
import { clearLocationHash, scrollToDocumentTop, setManualScrollRestoration } from "@/lib/scroll-to-top";

/**
 * Homepage nav writes hashes (#about, #methodology, …). Next.js client
 * navigation keeps that hash when only the locale prefix changes, so the
 * other language lands in a section instead of the hero. The pending flag
 * survives a header remount and is not cleared in the effect cleanup —
 * React Strict Mode would otherwise swallow the first switch.
 */
let pendingLocaleSwitchTop = false;

export function prepareLocaleSwitchTop() {
  pendingLocaleSwitchTop = true;
  setManualScrollRestoration();
  scrollToDocumentTop();
  clearLocationHash();
}

/** Call once from the header so footer + header clicks share a single reset. */
export function useLocaleSwitchScrollToTop(locale: Locale) {
  const pathname = usePathname() || `/${locale}`;
  useLayoutEffect(() => {
    if (!pendingLocaleSwitchTop) return;
    scrollToDocumentTop();
    clearLocationHash();
    const onScroll = () => {
      if (window.scrollY > 1) {
        scrollToDocumentTop();
        clearLocationHash();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const stop = window.setTimeout(() => {
      pendingLocaleSwitchTop = false;
      window.removeEventListener("scroll", onScroll);
    }, 700);
    return () => {
      window.clearTimeout(stop);
      window.removeEventListener("scroll", onScroll);
    };
  }, [locale, pathname]);
}

/**
 * BG / EN switch preserving the current route. Renders both locales so the
 * active one is visible; the inactive one is a link with hreflang/lang.
 */
export function LanguageSwitcher({
  current,
  tone = "ink",
  label,
  className,
}: {
  current: Locale;
  tone?: "ink" | "on-dark";
  label: string;
  className?: string;
}) {
  const pathname = usePathname() || `/${current}`;
  const dark = tone === "on-dark";

  return (
    <nav aria-label={label} className={cn("flex items-center font-sans text-small", className)}>
      {locales.map((loc, i) => {
        const active = loc === current;
        return (
          <span key={loc} className="flex items-center">
            {i > 0 ? (
              <span aria-hidden="true" className={cn("mx-2 h-3 w-px", dark ? "bg-on-dark/30" : "bg-line-strong")} />
            ) : null}
            {active ? (
              <span aria-current="true" lang={localeLabels[loc].htmlLang} className={cn("font-medium", dark ? "text-on-dark" : "text-ink")}>
                {localeLabels[loc].short}
                <span className="sr-only"> ({localeLabels[loc].long})</span>
              </span>
            ) : (
              <Link
                href={switchLocalePath(pathname, loc)}
                hrefLang={localeLabels[loc].htmlLang}
                lang={localeLabels[loc].htmlLang}
                scroll
                onClick={() => {
                  prepareLocaleSwitchTop();
                  capture("locale_switched", { from_locale: current, to_locale: loc });
                }}
                className={cn(
                  "transition-colors duration-150",
                  dark ? "text-on-dark-muted hover:text-on-dark" : "text-ink-3 hover:text-ink",
                )}
              >
                {localeLabels[loc].short}
                <span className="sr-only"> ({localeLabels[loc].long})</span>
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
