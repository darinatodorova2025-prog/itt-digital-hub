import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { primaryNav } from "@/content/site";
import { peoplePage as c } from "@/content/pages";
import { people } from "@/content/people";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/editorial/SectionHeading";
import { FoundersPair } from "@/components/people/FoundersPair";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "people", title: c.meta.title[locale], description: c.meta.description[locale] }),
    title: { absolute: c.meta.title[locale] },
  };
}

export default async function PeoplePage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const founders = people.filter((person) => person.slug === "ivan-todorov" || person.slug === "ivan-tomchev");

  return (
    <>
      <PageHeader label={primaryNav.find((item) => item.key === "people")?.label[locale]} heading={c.heading[locale]} lead={c.lead[locale]} />

      <Section id="team" labelledBy="team-heading" size="sm">
        <SectionHeading label={c.team.label[locale]} heading={c.structure.heading[locale]} id="team-heading" lead={c.structureNote[locale]} align="split" />
        <div className="mt-12">
          <FoundersPair people={founders} locale={locale} variant="profile" />
        </div>
      </Section>
    </>
  );
}
