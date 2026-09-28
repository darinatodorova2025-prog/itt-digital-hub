import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { primaryNav } from "@/content/site";
import { workPage as c } from "@/content/pages";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/editorial/SectionHeading";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactEmailLink } from "@/components/contact/ContactEmailLink";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "work-with-us", title: c.meta.title[locale], description: c.meta.description[locale] }),
    title: { absolute: c.meta.title[locale] },
  };
}

export default async function WorkWithUsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";

  return (
    <>
      <PageHeader
        label={primaryNav.find((item) => item.key === "work-with-us")?.label[locale]}
        heading={c.heading[locale]}
        lead={
          <>
            {c.lead[locale]}
            <span className="mt-4 block">
              <ContactEmailLink />
            </span>
          </>
        }
      />

      <Section id="contact" labelledBy="contact-heading" size="sm">
        <SectionHeading label={c.contact.label[locale]} heading={c.contact.heading[locale]} id="contact-heading" lead={c.pathBody[locale]} align="split" />
        <ContactForm locale={locale} />
      </Section>

      <Section tone="tint" labelledBy="principle-heading" size="sm">
        <SectionHeading label={c.independence.label[locale]} heading={c.independence.heading[locale]} id="principle-heading" lead={c.independenceBody[locale]} align="split" />
      </Section>
    </>
  );
}
