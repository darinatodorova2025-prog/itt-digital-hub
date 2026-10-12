import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";
import { loginAction } from "@/app/admin/actions";
import { isAdminSession } from "@/settlement-analyzer/server/admin-auth";
import { getAdminData } from "@/settlement-analyzer/server/admin-data";
import type { AdminPeriod } from "@/settlement-analyzer/server/admin-metrics";
import { privacyConfig } from "@/settlement-analyzer/server/config";
import { AdminDashboard } from "@/settlement-analyzer/conference/AdminDashboard";
import { adminCopy } from "@/settlement-analyzer/conference/admin-copy";
import { sa } from "@/settlement-analyzer/copy";

type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string | string[]; range?: string | string[]; campaign?: string | string[] }>;
};

function readableError(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default async function SettlementAnalyzerAdminPage({ params, searchParams }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  if (!(await isAdminSession())) {
    const query = await searchParams;
    return <SettlementAdminLogin locale={locale} error={readableError(query.error)} />;
  }
  const copy = sa(locale);
  const text = adminCopy(locale);
  const query = await searchParams;
  const data = await getAdminData({
    period: parsePeriod(one(query.range)),
    campaign: cleanCampaign(one(query.campaign)),
    locale,
  }).catch(() => null);
  if (!data) {
    return (
      <main className="admin-page">
        <div className="page-topbar">
          <a href={href(locale, "settlement-analyzer")}>← {copy.name}</a>
          <strong>{copy.admin}</strong>
        </div>
        <section className="admin-error">
          <h1>{text.loadErrorTitle}</h1>
          <p>{text.loadErrorBody}</p>
          <a className="button button--primary" href={href(locale, "settlement-analyzer")}>{copy.name}</a>
        </section>
      </main>
    );
  }
  return (
    <AdminDashboard
      locale={locale}
      analyzerHref={href(locale, "settlement-analyzer")}
      data={data}
      adminName="ITT"
      privacyReady={Boolean(privacyConfig().dataControllerName && privacyConfig().privacyContactEmail)}
    />
  );
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePeriod(value: string | undefined): AdminPeriod {
  return value === "7d" || value === "all" ? value : "30d";
}

function cleanCampaign(value: string | undefined) {
  return (value ?? "").trim().slice(0, 120);
}

function SettlementAdminLogin({ locale, error }: { locale: Locale; error?: string }) {
  const copy = sa(locale);
  const text = locale === "bg"
    ? {
        title: "Вход за екипа",
        lead: "Същият имейл и парола, с които влизаш в контролната зала.",
        email: "Имейл",
        password: "Парола",
        submit: "Вход",
      }
    : {
        title: "Team sign in",
        lead: "Use the same email and password as the control room.",
        email: "Email",
        password: "Password",
        submit: "Sign in",
      };
  return (
    <main className="admin-page">
      <div className="page-topbar">
        <a href={href(locale, "settlement-analyzer")}>← {copy.name}</a>
        <strong>{copy.admin}</strong>
      </div>
      <div className="admin-login">
        <section className="registration-card">
          <h1>{text.title}</h1>
          <p className="registration-lead">{text.lead}</p>
          <form action={loginAction}>
            <input type="hidden" name="next" value={href(locale, "settlement-analyzer", "admin")} />
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <label>
              {text.email}
              <input type="email" name="email" autoComplete="username" required />
            </label>
            <label>
              {text.password}
              <input type="password" name="password" autoComplete="current-password" required />
            </label>
            <button className="button button--primary registration-submit" type="submit">{text.submit}</button>
          </form>
        </section>
      </div>
    </main>
  );
}
