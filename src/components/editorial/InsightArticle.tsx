import type { Locale } from "@/lib/i18n";
import { href, type RouteKey } from "@/lib/paths";
import type { Insight, Project } from "@/content/types";
import { t } from "@/content/messages";
import { homeCrumb } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { insightRouteKey } from "@/lib/insight-channel";
import { formatSourceDate } from "@/lib/format-source-date";
import { Container } from "@/components/layout/Container";
import { Blocks } from "@/components/editorial/Blocks";
import { ArrowLink } from "@/components/ui/ArrowLink";
import { EditorialFigure } from "@/components/editorial/EditorialFigure";
import { ANALYSIS_MEDIA_ID_PREFIX } from "@/content/media";
import type { NewsCardMedia } from "@/lib/news-presentation";
import type { MediaRecord } from "@/lib/cms/types";

export function InsightArticle({
  insight,
  locale,
  listingTitle,
  listingKey,
  typeLabel,
  statusLabel,
  othersHeading,
  others,
  relatedProjects,
  hero,
  media,
}: {
  insight: Insight;
  locale: Locale;
  listingTitle: string;
  listingKey: Extract<RouteKey, "insights" | "news">;
  typeLabel: string;
  statusLabel?: string;
  othersHeading: string;
  others: Insight[];
  relatedProjects: Project[];
  hero?: NewsCardMedia | null;
  media?: MediaRecord[];
}) {
  const m = t(locale);
  const topics = insight.topics[locale].filter(Boolean);
  const source = insight.source[locale].trim();
  const dated = insight.date ? formatSourceDate(insight.date, locale) : "";
  const author = insight.author?.trim();
  const containFigure = Boolean(hero?.contain || insight.heroMediaId?.startsWith(ANALYSIS_MEDIA_ID_PREFIX));

  return (
    <article>
      <header className="bg-paper">
        <Container className="pt-12 pb-10 md:pt-16 md:pb-12">
          <Breadcrumbs
            label={m.breadcrumb}
            items={[homeCrumb(locale), { label: listingTitle, href: href(locale, listingKey) }, { label: typeLabel }]}
          />
          <div className="mt-6 lg:grid lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-8">
              <h1 className="text-h1 text-pretty text-ink">{insight.title[locale]}</h1>
              <p className="mt-6 max-w-[62ch] text-lead text-ink-2">{insight.summary[locale]}</p>
            </div>
          </div>
        </Container>
      </header>

      {hero ? (
        <Container className="pb-2">
          <EditorialFigure
            src={hero.src}
            alt={hero.alt}
            sizes="(min-width: 1024px) 1120px, 92vw"
            ratio={containFigure ? "aspect-[16/9]" : "aspect-[16/7]"}
            imageClassName={containFigure ? "object-contain" : "object-cover object-left"}
            priority
          />
        </Container>
      ) : null}

      <Container className="pb-section">
        <div className="grid gap-10 border-t border-line pt-10 lg:grid-cols-12 lg:gap-12">
          <aside className="lg:col-span-3" aria-label={typeLabel}>
            <dl className="text-small">
              <div className="border-b border-line pb-3">
                <dt className="label">{m.type}</dt>
                <dd className="mt-1 text-ink">{typeLabel}</dd>
              </div>
              {statusLabel ? (
                <div className="border-b border-line py-3">
                  <dt className="label">{m.status}</dt>
                  <dd className="mt-1 flex items-center gap-2 text-ink">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-amber" />
                    {statusLabel}
                  </dd>
                </div>
              ) : null}
              {dated ? (
                <div className="border-b border-line py-3">
                  <dt className="label">{m.publishedOn}</dt>
                  <dd className="mt-1 text-ink">{dated}</dd>
                </div>
              ) : null}
              {author ? (
                <div className="border-b border-line py-3">
                  <dt className="label">{m.author}</dt>
                  <dd className="mt-1 text-ink">{author}</dd>
                </div>
              ) : null}
              {topics.length ? (
                <div className="border-b border-line py-3">
                  <dt className="label">{m.topics}</dt>
                  <dd className="mt-1 text-ink">
                    <ul className="space-y-1">
                      {topics.map((tp) => (
                        <li key={tp}>{tp}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
              {source ? (
                <div className="border-b border-line py-3">
                  <dt className="label">{m.source}</dt>
                  <dd className="mt-1 text-ink-2">{source}</dd>
                </div>
              ) : null}
            </dl>
          </aside>
          <div className="lg:col-span-8 lg:col-start-5">
            <Blocks blocks={insight.body[locale]} locale={locale} media={media} className="max-w-[68ch]" />
            {relatedProjects.length ? (
              <div className="mt-12 border-t border-line pt-6">
                <p className="label mb-3">{m.relatedProjects}</p>
                <ul className="space-y-3">
                  {relatedProjects.map((p) => (
                    <li key={p.slug}>
                      <ArrowLink href={href(locale, "projects", p.slug)}>{p.title[locale]}</ArrowLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {others.length ? (
              <div className="mt-10 border-t border-line pt-6">
                <p className="label mb-3">{othersHeading}</p>
                <ul className="space-y-3">
                  {others.map((i) => (
                    <li key={i.slug}>
                      <ArrowLink href={href(locale, insightRouteKey(i.type), i.slug)}>{i.title[locale]}</ArrowLink>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </article>
  );
}
