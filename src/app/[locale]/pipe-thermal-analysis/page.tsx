import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { href } from "@/lib/paths";
import { pipeThermalAnalysis as copy } from "@/content/pipe-thermal-analysis";
import { Container } from "@/components/layout/Container";
import { PipeThermalHero } from "@/components/pipe-thermal-analysis/PipeThermalHero";
import { PipeThermalWorkspace } from "@/components/pipe-thermal-analysis/PipeThermalWorkspace";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({
      locale,
      key: "pipe-thermal-analysis",
      title: `${copy.meta.title[locale]} · ITT Digital Hub`,
      description: copy.meta.description[locale],
    }),
    title: { absolute: `${copy.meta.title[locale]} · ITT Digital Hub` },
    alternates: {
      canonical: href(locale, "pipe-thermal-analysis"),
      languages: { bg: href("bg", "pipe-thermal-analysis"), en: href("en", "pipe-thermal-analysis") },
    },
  };
}

export default async function PipeThermalAnalysisPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";

  return (
    <div className="bg-paper">
      <Container className="pt-4 pb-10 md:pt-5 md:pb-12">
        <PipeThermalHero locale={locale} />

        <div className="mt-5 md:mt-6">
          <PipeThermalWorkspace locale={locale} />
        </div>

        <article className="mt-4 rounded-[1.25rem] bg-white p-5 md:mt-5 md:p-6">
          <h2 className="text-h4 text-ink">{copy.contextTitle[locale]}</h2>
            <p className="mt-3 text-small text-ink-2">{copy.context[locale]}</p>
        </article>
      </Container>
    </div>
  );
}
