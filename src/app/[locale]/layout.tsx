import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import "../globals.css";
import { fontClassName } from "../fonts";
import { isLocale, locales, localeLabels, type Locale } from "@/lib/i18n";
import { siteUrl } from "@/lib/site-url";
import { site } from "@/content/site";
import { t } from "@/content/messages";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { OrganizationJsonLd } from "@/components/layout/OrganizationJsonLd";
import { allowPublicIndexing, robotsDirective } from "@/lib/indexing";
import { Analytics } from "@vercel/analytics/next";
import { AnalyticsRoute } from "@/components/analytics/AnalyticsRoute";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: site.name[locale],
      template: `%s · ${site.short[locale]}`,
    },
    description: site.description[locale],
    applicationName: site.name[locale],
    robots: robotsDirective(allowPublicIndexing()),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const m = t(locale);

  return (
    <html lang={localeLabels[locale].htmlLang} className={fontClassName}>
      <body className="flex min-h-svh w-full min-w-0 flex-col">
        <SiteChrome locale={locale} skipLabel={m.skipToContent}>
          {children}
        </SiteChrome>
        <OrganizationJsonLd locale={locale} />
        <AnalyticsRoute locale={locale} />
        <Analytics />
      </body>
    </html>
  );
}
