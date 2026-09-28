"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { SiteHeader } from "./SiteHeader";
import { SiteFooterGate } from "./SiteFooterGate";
import { ResetWindowScroll } from "./ResetWindowScroll";

function isConferencePath(pathname: string): boolean {
  return /\/mahni-dosadnoto(?:\/|$)/.test(pathname);
}

export function SiteChrome({
  locale,
  skipLabel,
  children,
}: {
  locale: Locale;
  skipLabel: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const conference = isConferencePath(pathname);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-full focus:bg-signal focus:px-4 focus:py-2 focus:text-on-dark"
      >
        {skipLabel}
      </a>
      {conference ? null : <SiteHeader locale={locale} />}
      <main id="main" className={conference ? "md-event-main min-w-0 w-full flex-1" : "min-w-0 w-full flex-1"}>
        {children}
      </main>
      {conference ? null : <SiteFooterGate locale={locale} />}
      <ResetWindowScroll />
    </>
  );
}
