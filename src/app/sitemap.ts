import type { MetadataRoute } from "next";
import { locales, localeLabels } from "@/lib/i18n";
import { href, type RouteKey } from "@/lib/paths";
import { siteUrl } from "@/lib/site-url";
import { projects as seedProjects } from "@/content/projects";
import { listPublishedProjects } from "@/lib/cms/repository";

const staticRoutes: Array<{ key: RouteKey; priority: number }> = [
  { key: "home", priority: 1 },
  { key: "projects", priority: 0.9 },
  { key: "about", priority: 0.8 },
  { key: "methodology", priority: 0.8 },
  { key: "tools", priority: 0.8 },
  { key: "people", priority: 0.8 },
  { key: "work-with-us", priority: 0.8 },
  { key: "privacy", priority: 0.3 },
  { key: "ai-act", priority: 0.8 },
  { key: "settlement-analyzer", priority: 0.8 },
  { key: "pipe-thermal-analysis", priority: 0.8 },
  { key: "vik-proektant", priority: 0.8 },
];

function entry(key: RouteKey, priority: number, slug?: string): MetadataRoute.Sitemap {
  const base = siteUrl();
  const languages: Record<string, string> = {};
  for (const loc of locales) languages[localeLabels[loc].htmlLang] = `${base}${href(loc, key, slug)}`;
  languages["x-default"] = `${base}${href("bg", key, slug)}`;
  return locales.map((loc) => ({
    url: `${base}${href(loc, key, slug)}`,
    changeFrequency: "monthly",
    priority,
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = (await listPublishedProjects().catch(() => seedProjects)) ?? seedProjects;
  return [
    ...staticRoutes.flatMap((r) => entry(r.key, r.priority)),
    ...entry("ai-act", 0.8, "compare"),
    ...entry("settlement-analyzer", 0.5, "privacy"),
    ...entry("vik-proektant", 0.8, "compare"),
    ...projects.flatMap((p) => entry("projects", 0.7, p.slug)),
  ];
}
