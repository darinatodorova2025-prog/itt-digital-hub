import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { pageMetadata } from "@/lib/metadata";
import { primaryNav } from "@/content/site";
import { methodologyPage as c } from "@/content/pages";
import { t } from "@/content/messages";
import { approachStages } from "@/content/approach";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Section } from "@/components/layout/Section";
import { ArrowLink } from "@/components/ui/ArrowLink";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "methodology", title: c.meta.title[locale], description: c.meta.description[locale] }),
    title: { absolute: c.meta.title[locale] },
  };
}

export default async function MethodologyPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const m = t(locale);

  return (
    <>
      <PageHeader label={primaryNav.find((item) => item.key === "methodology")?.label[locale]} heading={c.heading[locale]} lead={c.lead[locale]} />
      <Section size="sm" labelledBy="approach-stages">
        <ol id="approach-stages" className="grid border-t border-line md:grid-cols-3">
          {approachStages.map((stage) => (
            <li key={stage.code} className="border-b border-line py-8 md:border-b-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
              <p className="label">{stage.code}</p>
              <h2 className="mt-2 text-h3 text-ink">{stage.title[locale]}</h2>
              <p className="mt-3 text-body text-ink-2">{stage.body[locale]}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <ArrowLink href={href(locale, "work-with-us")}>{m.toWorkWithUs}</ArrowLink>
        </div>
      </Section>
    </>
  );
}
