"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { t } from "@/content/messages";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { sa } from "./copy";

export function ProductHeader({
  locale,
  ownerMode,
  onNewAnalysis,
  infoSlot,
  feedbackSlot,
}: {
  locale: Locale;
  ownerMode?: boolean;
  onNewAnalysis?: () => void;
  infoSlot?: ReactNode;
  feedbackSlot?: ReactNode;
}) {
  const copy = sa(locale);
  return (
    <header className="sa-header">
      <div className="sa-header__identity">
        <Breadcrumbs label={t(locale).breadcrumb} items={breadcrumbTrail(locale, "settlement")} />
      </div>
      <div className="sa-header__actions">
        {ownerMode ? (
          <Link className="button admin-link" href={href(locale, "settlement-analyzer", "admin")}>
            {copy.admin}
          </Link>
        ) : null}
        {onNewAnalysis ? (
          <button type="button" className="button new-analysis" onClick={onNewAnalysis}>
            {copy.newAnalysis}
          </button>
        ) : null}
        {feedbackSlot}
        {infoSlot}
      </div>
    </header>
  );
}
