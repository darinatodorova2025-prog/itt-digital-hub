import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { pageMetadata } from "@/lib/metadata";
import { primaryNav } from "@/content/site";
import { about } from "@/content/pages";
import { t } from "@/content/messages";
import { solvePageProblems } from "@/content/problems";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/editorial/SectionHeading";
import { ArrowLink } from "@/components/ui/ArrowLink";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "about", title: about.meta.title[locale], description: about.meta.description[locale] }),
    title: { absolute: about.meta.title[locale] },
  };
}

export default async function AboutPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const m = t(locale);

  return (
    <>
      <PageHeader label={primaryNav.find((item) => item.key === "about")?.label[locale]} heading={about.heading[locale]} lead={about.lead[locale]} />

      <Section labelledBy="problems-heading" size="sm">
        <h2 id="problems-heading" className="sr-only">
          {primaryNav.find((item) => item.key === "about")?.label[locale]}
        </h2>
        <ol className="grid border-t border-line md:grid-cols-3">
          {solvePageProblems.map((item) => (
            <li key={item.code} className="border-b border-line py-6 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <p className="label">{item.code}</p>
              <h3 className="mt-2 text-h3 text-ink">{item.title[locale]}</h3>
              <p className="mt-2 text-small text-ink-2">{item.body[locale]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="dark" labelledBy="judgement-heading" size="sm">
        <SectionHeading
          tone="on-dark"
          label={about.improvement.label[locale]}
          heading={about.improvement.heading[locale]}
          id="judgement-heading"
          headingClassName="text-on-dark border-b-2 border-signal pb-3"
          lead={about.improvement.lead[locale]}
          align="split"
        />
        <div className="mt-8">
          <ArrowLink href={href(locale, "work-with-us")}>{m.toWorkWithUs}</ArrowLink>
        </div>
      </Section>
    </>
  );
}
