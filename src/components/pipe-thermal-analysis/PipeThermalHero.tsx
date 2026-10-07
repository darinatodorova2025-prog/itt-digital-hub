import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { pipeThermalAnalysis as copy } from "@/content/pipe-thermal-analysis";
import { t } from "@/content/messages";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

export function PipeThermalHero({ locale }: { locale: Locale }) {
  return (
    <div>
      <Breadcrumbs label={t(locale).breadcrumb} items={breadcrumbTrail(locale, "pipe")} />
      <div className="pta-hero">
        <header className="pta-hero-copy">
          <p className="label">{copy.label[locale]}</p>
          <h1 className="pta-hero-title mt-1.5">{copy.heading[locale]}</h1>
          <p className="mt-2 max-w-[36rem] text-body text-ink-2">{copy.lead[locale]}</p>
          <p className="mt-1.5 max-w-[34rem] text-small text-ink-3">{copy.support[locale]}</p>
        </header>
        <div className="pta-hero-visual">
          <Image
            src="/tools/pipe-thermal-analysis-hero.jpg"
            alt={copy.heroImageAlt[locale]}
            fill
            priority
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-cover object-[82%_45%]"
          />
        </div>
      </div>
    </div>
  );
}
