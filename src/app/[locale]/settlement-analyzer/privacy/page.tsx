import type { Metadata } from "next";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { contactEmail } from "@/content/site";
import { privacyConfig } from "@/settlement-analyzer/server/config";
import { sa, settlementAnalyzer } from "@/settlement-analyzer/copy";
import { pageMetadata } from "@/lib/metadata";
import { t } from "@/content/messages";
import { breadcrumbTrail } from "@/lib/breadcrumbs";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const title = settlementAnalyzer.privacy[locale].documentTitle;
  return {
    ...pageMetadata({
      locale,
      key: "settlement-analyzer",
      slug: "privacy",
      title,
      description: settlementAnalyzer.metaDescription[locale],
    }),
    title: { absolute: title },
    alternates: {
      canonical: href(locale, "settlement-analyzer", "privacy"),
      languages: {
        bg: href("bg", "settlement-analyzer", "privacy"),
        en: href("en", "settlement-analyzer", "privacy"),
      },
    },
  };
}

export default async function SettlementAnalyzerPrivacyPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const config = privacyConfig();
  const copy = sa(locale);
  const privacy = copy.privacy;
  const email = config.privacyContactEmail || contactEmail;
  const controller = config.dataControllerName;
  return (
    <main className="privacy-page">
      <div className="page-topbar">
        <Breadcrumbs label={t(locale).breadcrumb} items={breadcrumbTrail(locale, "settlement-privacy")} />
      </div>
      <article className="privacy-content">
        <h1>{privacy.heading}</h1>
        <section>
          <h2>{privacy.collectTitle}</h2>
          <p>{privacy.collectBody}</p>
        </section>
        <section>
          <h2>{privacy.whyTitle}</h2>
          <p>{privacy.whyBody}</p>
        </section>
        <section>
          <h2>{privacy.usageTitle}</h2>
          <p>{privacy.usageBody}</p>
        </section>
        <section>
          <h2>{privacy.marketingTitle}</h2>
          <p>{privacy.marketingBody}</p>
        </section>
        <section>
          <h2>{privacy.storageTitle}</h2>
          <p>{privacy.storageBody}</p>
        </section>
        <section>
          <h2>{privacy.thirdTitle}</h2>
          <p>{privacy.thirdBody}</p>
        </section>
        <section>
          <h2>{privacy.retentionTitle}</h2>
          <p>
            {locale === "en"
              ? `Data are kept for up to ${config.retentionMonths} months after last activity, unless the law requires otherwise or you ask for earlier deletion.`
              : `Данните се съхраняват до ${config.retentionMonths} месеца след последната активност, освен ако законът изисква друго или поискате по-ранно изтриване.`}
          </p>
        </section>
        <section>
          <h2>{privacy.rightsTitle}</h2>
          <p>{privacy.rightsBody}</p>
        </section>
        <section>
          <h2>{privacy.contactTitle}</h2>
          <p>
            {privacy.contactBefore}<a href={`mailto:${email}`}>{email}</a>{controller ? (locale === "en" ? `, data controller: ${controller}.` : `, администратор на данните: ${controller}.`) : "."}
          </p>
        </section>
      </article>
    </main>
  );
}
