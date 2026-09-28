import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { primaryNav } from "@/content/site";
import { projectsPage as c } from "@/content/pages";
import { listPublishedProjects } from "@/lib/cms/repository";
import { PageHeader } from "@/components/editorial/PageHeader";
import { Container } from "@/components/layout/Container";
import { StoryCard } from "@/components/projects/StoryCard";
import { storyCovers } from "@/content/stories";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "projects", title: c.meta.title[locale], description: c.meta.description[locale] }),
    title: { absolute: c.meta.title[locale] },
  };
}

export default async function ProjectsPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const projects = await listPublishedProjects();

  return (
    <>
      <PageHeader label={primaryNav.find((item) => item.key === "projects")?.label[locale]} heading={c.heading[locale]} lead={c.lead[locale]} />
      <Container className="pb-section">
        <ol className="grid gap-10 sm:grid-cols-2">
          {projects.map((p) => (
            <li key={p.slug}>
              <StoryCard project={p} locale={locale} cover={storyCovers[p.slug]} />
            </li>
          ))}
        </ol>
      </Container>
    </>
  );
}
