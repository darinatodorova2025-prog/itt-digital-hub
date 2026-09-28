import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { pageMetadata } from "@/lib/metadata";
import { t } from "@/content/messages";
import { breadcrumbTrail, projectCrumbLabel } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { projects } from "@/content/projects";
import { getProjectForPublic, listPublishedArticles, listPublishedProjects } from "@/lib/cms/repository";
import { insightRouteKey } from "@/lib/insight-channel";
import { Container } from "@/components/layout/Container";
import { ProjectStory } from "@/components/projects/ProjectStory";
import { ProjectTags } from "@/components/projects/StoryCard";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { projectHeroVisuals, storyCovers } from "@/content/stories";
import { EditorialFigure } from "@/components/editorial/EditorialFigure";

type Params = { params: Promise<{ locale: string; slug: string }> };

/** Preview cookies and CMS reads must run per request. */
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return locales.flatMap((locale) => projects.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const project = await getProjectForPublic(slug);
  if (!project) return {};
  const seo = project.seo;
  const meta = pageMetadata({
    locale,
    key: "projects",
    slug,
    title: project.title[locale],
    description: seo?.description[locale] ?? project.standfirst[locale],
    ogTitle: seo?.ogTitle[locale] ?? project.title[locale],
    ogDescription: seo?.ogDescription[locale],
    image: seo?.image,
    type: "article",
  });
  if (seo?.documentTitle[locale]) {
    return { ...meta, title: { absolute: seo.documentTitle[locale] } };
  }
  return meta;
}

export default async function ProjectDetailPage({ params }: Params) {
  const { locale: raw, slug } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const project = await getProjectForPublic(slug);
  if (!project) notFound();
  const m = t(locale);
  const [publishedProjects, publishedArticles] = await Promise.all([listPublishedProjects(), listPublishedArticles()]);
  const related = (project.related ?? []).map((relatedSlug) => publishedProjects.find((p) => p.slug === relatedSlug)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const relatedInsights = (project.relatedInsights ?? []).map((relatedSlug) => publishedArticles.find((i) => i.slug === relatedSlug)).filter((i): i is NonNullable<typeof i> => Boolean(i));
  const cover = storyCovers[project.slug];
  const heroVisual = projectHeroVisuals[project.slug];
  const tags = project.tags?.[locale] ?? [];

  return (
    <article>
      <header className="bg-paper">
        <Container className="pt-12 pb-10 md:pt-16 md:pb-12">
          <Breadcrumbs
            label={m.breadcrumb}
            items={breadcrumbTrail(locale, "project", projectCrumbLabel(locale, project.slug, project.title[locale]))}
          />
          <div className="mt-5 max-w-4xl">
            {tags.length ? <ProjectTags tags={tags} /> : null}
            <h1 className={tags.length ? "mt-5 text-h1 text-pretty text-ink" : "text-h1 text-pretty text-ink"}>{project.title[locale]}</h1>
            <p className="mt-6 max-w-[62ch] text-lead text-ink-2">{project.standfirst[locale]}</p>
            {project.proofPoint ? (
              <p className="mt-8 max-w-[46ch] border-l-2 border-signal pl-5 font-sans text-h4 text-ink">{project.proofPoint[locale]}</p>
            ) : null}
          </div>
          {heroVisual ? (
            <EditorialFigure
              src={heroVisual.src}
              alt={heroVisual.alt[locale]}
              caption={heroVisual.caption?.[locale]}
              ratio="aspect-[16/9]"
              className="mt-12 overflow-hidden rounded-[1.25rem] border-0 lg:mt-14"
              imageClassName="object-cover"
              objectPosition={heroVisual.objectPosition}
              sizes="(min-width: 1024px) 1100px, 100vw"
              priority
            />
          ) : cover?.kind === "photo" ? (
            <EditorialFigure
              src={cover.src}
              alt={cover.alt[locale]}
              ratio="aspect-[16/9]"
              className="mt-12 overflow-hidden rounded-[1.25rem] border-0 lg:mt-14"
              imageClassName="object-cover"
              objectPosition={cover.objectPosition}
              sizes="(min-width: 1024px) 1100px, 100vw"
              priority
            />
          ) : null}
        </Container>
      </header>

      <Container className="pb-section">
        <div className="max-w-4xl">
          {project.story ? <ProjectStory project={project} locale={locale} /> : <p className="text-body text-ink-2">{project.summary[locale]}</p>}

          {related.length || relatedInsights.length ? (
            <section aria-labelledby="related-heading" className="grid gap-8 border-t border-line py-10 md:grid-cols-2">
              <h2 id="related-heading" className="sr-only">
                {m.relatedProjects} / {m.relatedInsights}
              </h2>
              {related.length ? (
                <div>
                  <p className="label mb-3">{m.relatedProjects}</p>
                  <ul className="space-y-3">
                    {related.map((p) => (
                      <li key={p.slug}>
                        <ArrowLink href={href(locale, "projects", p.slug)}>{p.title[locale]}</ArrowLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {relatedInsights.length ? (
                <div>
                  <p className="label mb-3">{m.relatedInsights}</p>
                  <ul className="space-y-3">
                    {relatedInsights.map((i) => (
                      <li key={i.slug}>
                        <ArrowLink href={href(locale, insightRouteKey(i.type), i.slug)}>{i.title[locale]}</ArrowLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </Container>
    </article>
  );
}
