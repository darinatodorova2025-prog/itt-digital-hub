import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { toolsPage as c } from "@/content/pages";
import { toolsFor } from "@/content/tools";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Container } from "@/components/layout/Container";
import { ToolCard } from "@/components/tools/ToolCard";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "tools", title: c.meta.title[locale], description: c.meta.description[locale] }),
    title: { absolute: c.meta.title[locale] },
  };
}

export default async function ToolsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const tools = toolsFor(locale);

  return (
    <div className="hero-atmosphere text-on-dark" data-surface="dark">
      <PageHeader
        heading={c.heading[locale]}
        lead={c.lead[locale]}
        support={c.support[locale] || undefined}
        tone="dark"
        className="pt-14 md:pt-20"
      />
      <Container className="pb-section">
        <ol className="grid gap-8 lg:grid-cols-2 lg:gap-10 xl:grid-cols-3">
          {tools.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} openLabel={c.open[locale]} tone="dark" />
            </li>
          ))}
        </ol>
      </Container>
    </div>
  );
}
