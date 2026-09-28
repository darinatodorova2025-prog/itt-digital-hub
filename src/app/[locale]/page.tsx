import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { pageMetadata } from "@/lib/metadata";
import { home } from "@/content/pages";
import { t } from "@/content/messages";
import { people } from "@/content/people";
import { problemClasses } from "@/content/problems";
import { approachStages } from "@/content/approach";
import { listPublishedProjects } from "@/lib/cms/repository";
import { Hero } from "@/components/editorial/Hero";
import { Section } from "@/components/layout/Section";
import { SectionHeading } from "@/components/editorial/SectionHeading";
import { StoriesCarousel } from "@/components/projects/StoriesCarousel";
import { StoryCard } from "@/components/projects/StoryCard";
import { storyCovers } from "@/content/stories";
import { PartnersBand } from "@/components/partners/PartnersBand";
import { FoundersPair } from "@/components/people/FoundersPair";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { ContactForm } from "@/components/contact/ContactForm";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    ...pageMetadata({ locale, key: "home", title: home.meta.title[locale], description: home.meta.description[locale] }),
    title: { absolute: home.meta.title[locale] },
  };
}

export default async function HomePage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const m = t(locale);
  const c = home;
  const founders = people.filter((person) => person.slug === "ivan-todorov" || person.slug === "ivan-tomchev");
  const projects = await listPublishedProjects();
  const [firstProject, ...restProjects] = projects;

  return (
    <>
      <Hero
        layout="editorial"
        tone="dark"
        label={c.hero.label[locale]}
        headline={c.hero.headline[locale]}
        lead={c.hero.lead[locale]}
        support={c.hero.support[locale]}
        primary={{ href: `/${locale}#work`, label: c.hero.primary[locale] }}
        secondary={{ href: `/${locale}#contact`, label: c.hero.secondary[locale] }}
        visual={
          <div className="surface-card shadow-[0_24px_80px_rgba(4,14,49,0.28)]">
            <p className="label">{c.hero.proofLabel[locale]}</p>
            <ol className="mt-4 divide-y divide-line">
              {projects.map((project, index) => (
                <li key={project.slug} className={index === 0 ? "py-4 first:pt-3 last:pb-0" : "py-3.5 last:pb-0"}>
                  <div className={index === 0 ? "border-l-2 border-signal pl-3" : undefined}>
                    <p className={index === 0 ? "font-sans text-h3 text-pretty text-ink" : "font-sans text-h4 text-pretty text-ink"}>
                      {project.title[locale]}
                    </p>
                    <p className="mt-1 text-meta text-ink-3">{project.domain[locale]}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        }
      />

      <PartnersBand locale={locale} />

      <Section id="work" labelledBy="work-heading" rule={false}>
        <SectionHeading
          label={c.featured.label[locale]}
          heading={c.featured.heading[locale]}
          id="work-heading"
          lead={c.featured.lead[locale]}
          align="split"
        />
        <div className="mt-12">
          {firstProject && restProjects.length > 0 ? (
            <div className="grid min-w-0 gap-6 lg:grid-cols-12 lg:gap-10">
              <div className="min-w-0 lg:col-span-7">
                <StoryCard project={firstProject} locale={locale} cover={storyCovers[firstProject.slug]} featured />
              </div>
              <div className="min-w-0 lg:col-span-5">
                <StoriesCarousel projects={restProjects} locale={locale} single />
              </div>
            </div>
          ) : (
            <StoriesCarousel projects={projects} locale={locale} />
          )}
        </div>
        <div className="mt-10">
          <ArrowLink href={href(locale, "projects")}>{m.viewMore}</ArrowLink>
        </div>
      </Section>

      <Section id="problems" tone="tint" labelledBy="problems-heading" size="sm" rule={false}>
        <SectionHeading
          label={c.problems.label[locale]}
          heading={c.problems.heading[locale]}
          id="problems-heading"
          lead={c.problems.lead[locale]}
          align="split"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {problemClasses.map((item) => (
            <li key={item.code} className="surface-card">
              <p className="font-mono text-meta tracking-[0.08em] text-signal">{item.code}</p>
              <h3 className="mt-3 text-h3 text-ink">{item.title[locale]}</h3>
              <p className="mt-2 text-small text-ink-2">{item.body[locale]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="judgement" tone="dark" labelledBy="judgement-heading" size="sm" rule={false}>
        <SectionHeading
          tone="on-dark"
          label={c.judgement.label[locale]}
          heading={c.judgement.heading[locale]}
          id="judgement-heading"
          lead={c.judgement.lead[locale]}
          align="split"
        />
      </Section>

      <Section id="benefit" labelledBy="benefit-heading" size="sm" rule={false}>
        <SectionHeading
          label={c.benefit.label[locale]}
          heading={c.benefit.heading[locale]}
          id="benefit-heading"
          lead={c.benefit.lead[locale]}
          align="split"
        />
      </Section>

      <Section id="approach" labelledBy="approach-heading" size="sm" rule={false}>
        <SectionHeading
          label={c.approach.label[locale]}
          heading={c.approach.heading[locale]}
          id="approach-heading"
          lead={c.approach.lead[locale]}
          align="split"
        />
        <ol className="mt-12 grid gap-4 md:grid-cols-3 md:gap-5">
          {approachStages.map((stage) => (
            <li key={stage.code} className="surface-card">
              <p className="font-mono text-meta tracking-[0.08em] text-signal">{stage.code}</p>
              <h3 className="mt-3 text-h3 text-ink">{stage.title[locale]}</h3>
              <p className="mt-2 text-small text-ink-2">{stage.body[locale]}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="people" labelledBy="people-heading" rule={false}>
        <SectionHeading
          label={c.people.label[locale]}
          heading={c.people.heading[locale]}
          id="people-heading"
          lead={c.people.lead[locale]}
          align="split"
        />
        <div className="mt-12">
          <FoundersPair people={founders} locale={locale} variant="card" />
        </div>
        <div className="mt-10">
          <ArrowLink href={href(locale, "people")}>{m.toPeople}</ArrowLink>
        </div>
      </Section>

      <Section id="contact" tone="tint" labelledBy="contact-heading" size="sm" rule={false}>
        <SectionHeading
          label={c.work.label[locale]}
          heading={c.work.heading[locale]}
          id="contact-heading"
          lead={c.work.lead[locale]}
          align="split"
        />
        <ContactForm locale={locale} />
      </Section>
    </>
  );
}
