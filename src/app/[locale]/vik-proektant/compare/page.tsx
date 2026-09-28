import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { href } from "@/lib/paths";
import { vikProektant } from "@/content/vik-proektant";
import { t } from "@/content/messages";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { Container } from "@/components/layout/Container";
import { Breadcrumbs, ParentReturn } from "@/components/layout/Breadcrumbs";
import { CompareLab } from "@/components/vik-proektant/CompareLab";
import { AssistantScope } from "@/components/vik-proektant/AssistantScope";
import { chatGptDestination } from "@/vik-proektant/publication";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({
      locale,
      key: "vik-proektant",
      slug: "compare",
      title: vikProektant.compareMeta.title[locale],
      description: vikProektant.compareMeta.description[locale],
    }),
    title: { absolute: `${vikProektant.compareMeta.title[locale]} · ITT Digital Hub` },
    alternates: {
      canonical: href(locale, "vik-proektant", "compare"),
      languages: {
        bg: href("bg", "vik-proektant", "compare"),
        en: href("en", "vik-proektant", "compare"),
      },
    },
  };
}

export default async function VikComparePage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const text = vikProektant.compare;
  const destination = chatGptDestination();
  return (
    <div>
      <section className="hero-atmosphere -mt-[5.5rem] text-on-dark" data-surface="dark">
        <Container className="pt-24 pb-12 md:pt-28 md:pb-14">
          <Breadcrumbs label={t(locale).breadcrumb} items={breadcrumbTrail(locale, "vik-compare")} tone="dark" />
          <ParentReturn href={href(locale, "vik-proektant")} tone="dark" className="mt-2">
            {text.returnTo[locale]}
          </ParentReturn>
          <h1 className="mt-4 max-w-[22ch] whitespace-pre-line text-h1 text-on-dark md:max-w-[28ch]">{text.heading[locale]}</h1>
          <p className="mt-3 max-w-[68ch] text-body text-on-dark-muted">{text.lead[locale]}</p>
          <ul className="mt-3 grid list-disc gap-x-10 gap-y-1.5 pl-5 text-small text-on-dark-muted md:grid-cols-2">
            {text.leadPoints.map((point) => (
              <li key={point.label.en} className="text-pretty">
                <strong className="font-medium text-on-dark">{point.label[locale]}</strong> {point.text[locale]}
              </li>
            ))}
          </ul>
          <AssistantScope locale={locale} chatGptUrl={destination.state === "published" ? destination.url : null} />
        </Container>
      </section>
      <div className="bg-paper">
        <Container className="relative z-10 -mt-8 pb-16 md:-mt-10 md:pb-24">
          <CompareLab locale={locale} />
        </Container>
      </div>
    </div>
  );
}
