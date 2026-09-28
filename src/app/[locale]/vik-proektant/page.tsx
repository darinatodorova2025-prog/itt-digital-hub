import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { href } from "@/lib/paths";
import { t } from "@/content/messages";
import { vikProektant } from "@/content/vik-proektant";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { ButtonLink } from "@/components/ui/ButtonLink";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({
      locale,
      key: "vik-proektant",
      title: vikProektant.meta.title[locale],
      description: vikProektant.meta.description[locale],
    }),
    title: { absolute: `${vikProektant.meta.title[locale]} · ITT Digital Hub` },
    alternates: {
      canonical: href(locale, "vik-proektant"),
      languages: { bg: href("bg", "vik-proektant"), en: href("en", "vik-proektant") },
    },
  };
}

export default async function VikProektantPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return (
    <div>
      <section className="hero-atmosphere -mt-[5.5rem] text-on-dark" data-surface="dark">
        <Container className="pt-24 pb-12 md:pt-28 md:pb-14">
          <Breadcrumbs label={t(locale).breadcrumb} items={breadcrumbTrail(locale, "vik")} tone="dark" />
          <h1 className="mt-4 max-w-[22ch] text-h1 text-on-dark md:max-w-[28ch]">{vikProektant.heading[locale]}</h1>
          <p className="mt-3 max-w-[68ch] text-body text-on-dark-muted">{vikProektant.lead[locale]}</p>
          <p className="mt-3 max-w-[68ch] text-small text-on-dark-muted">{vikProektant.support[locale]}</p>
        </Container>
      </section>
      <div className="bg-paper">
        <Container className="relative z-10 -mt-8 pb-16 md:-mt-10 md:pb-24">
          <div className="rounded-[1.5rem] border border-line bg-white px-5 py-6 shadow-[0_16px_40px_rgba(4,14,49,0.06)] md:px-8 md:py-8">
            <div className="grid gap-8 md:grid-cols-3">
              {vikProektant.scopePoints.map((section) => (
                <section key={section.title.en}>
                  <h2 className="text-h4 text-ink">{section.title[locale]}</h2>
                  <p className="mt-3 text-small leading-[1.7] text-ink-2">{section.text[locale]}</p>
                </section>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-6">
              <ButtonLink href={href(locale, "vik-proektant", "compare")}>{vikProektant.compareCta[locale]}</ButtonLink>
              <p className="max-w-[42ch] text-small text-ink-3">{vikProektant.compareHint[locale]}</p>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
