"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { capture, captureOnce, registerContext, rememberCampaign, syncReplay } from "@/lib/analytics/client";
import { analyticsBlockedPath, appEnvironment, toolIdFromPath } from "@/lib/analytics/config";

const LAST_TOOL = "itt_last_tool";

export function AnalyticsRoute({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  useEffect(() => {
    const campaign = rememberCampaign(window.location.search, document.cookie);
    registerContext({ locale, environment: appEnvironment(), ...campaign });
    syncReplay(pathname);
    if (analyticsBlockedPath(pathname)) return;

    if (pathname.includes("/tools")) {
      captureOnce(`catalogue:${pathname}`, "tools_catalogue_viewed", { locale, tool_id: "tools" });
    }
    if (pathname.includes("/work-with-us")) {
      captureOnce(`contact:${pathname}`, "contact_viewed", { locale, surface: "work-with-us" });
    }
    const toolId = toolIdFromPath(pathname);
    if (toolId) {
      const previous = readLastTool();
      captureOnce(`opened:${pathname}`, "tool_opened", {
        tool_id: toolId,
        locale,
        ...(previous && previous !== toolId ? { from_tool: previous } : {}),
      });
      writeLastTool(toolId);
    }

    const seen = new Set<number>();
    const onScroll = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      if (height <= 80) return;
      const depth = (window.scrollY / height) * 100;
      for (const mark of [50, 90]) {
        if (depth < mark || seen.has(mark)) continue;
        seen.add(mark);
        capture("scroll_depth", {
          locale,
          path: pathname,
          depth: mark,
          ...(toolId ? { tool_id: toolId } : {}),
        });
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [locale, pathname]);

  return null;
}

function readLastTool(): string | null {
  try {
    return window.sessionStorage.getItem(LAST_TOOL);
  } catch {
    return null;
  }
}

function writeLastTool(toolId: string): void {
  try {
    window.sessionStorage.setItem(LAST_TOOL, toolId);
  } catch {
    // ignore
  }
}
