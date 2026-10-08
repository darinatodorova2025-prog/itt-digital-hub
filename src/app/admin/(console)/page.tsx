import Link from "next/link";
import { redirect } from "next/navigation";
import { getDashboardStats, loadAllRecords } from "@/lib/cms/repository";
import { getContentSourceSnapshot } from "@/lib/cms/content-source";
import { translationState } from "@/lib/cms/truth";

export default function AdminHome() {
  redirect("/admin/mahni-dosadnoto");
}

/** CMS operational dashboard. Kept in source; /admin opens the game admin instead. */
export async function CmsDashboard() {
  const stats = await getDashboardStats();
  const { projects, insights } = await loadAllRecords();
  const source = getContentSourceSnapshot();
  const cards = [
    ["Draft projects", stats.draftProjects, "/admin/projects"],
    ["Draft insights", stats.draftInsights, "/admin/insights"],
    ["Awaiting review", stats.awaitingReview, "/admin/projects"],
    ["Temporary images", stats.temporaryImages, "/admin/media"],
    ["Missing EN", stats.missingEn, "/admin/projects"],
    ["Missing BG", stats.missingBg, "/admin/projects"],
    ["Incomplete SEO", stats.incompleteSeo, "/admin/projects"],
  ] as const;

  return (
    <>
      <h1 style={{ fontFamily: "var(--font-source-serif)", fontSize: "1.75rem" }}>Dashboard</h1>
      <p className="admin-muted">Operational counts only. No fabricated analytics.</p>
      {source?.source === "seed-fallback" ? (
        <p className="admin-card" role="status" style={{ marginTop: "1rem" }}>
          Public pages are serving the versioned seed fallback because the CMS could not be read.
          {source.fallbackReason ? ` ${source.fallbackReason}` : ""} Public visitors do not see this message.
        </p>
      ) : (
        <p className="admin-muted" style={{ marginTop: "0.75rem" }}>
          Public content source: {source?.source ?? "unknown"}
        </p>
      )}
      <div className="admin-grid" style={{ marginTop: "1.25rem" }}>
        {cards.map(([label, value, href]) => (
          <Link key={label} href={href} className="admin-card">
            <p className="admin-status">{label}</p>
            <p style={{ fontSize: "1.75rem", marginTop: "0.35rem" }}>{value}</p>
          </Link>
        ))}
      </div>
      <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>Translation gaps</h2>
      <ul className="admin-card" style={{ marginTop: "0.75rem" }}>
        {(() => {
          const items = [...projects, ...insights].flatMap((item) => {
            const state = translationState(item.titleBg, item.titleEn);
            if (state === "both") return [];
            return [{ slug: item.slug, state }];
          });
          if (items.length === 0) {
            return (
              <li className="admin-muted" key="none">
                BG and EN titles are present on current projects and insights.
              </li>
            );
          }
          return items.map((item) => (
            <li key={item.slug}>
              <span className="admin-status">{item.state}</span> · {item.slug}
            </li>
          ));
        })()}
      </ul>
      <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>Recently updated</h2>
      <ul className="admin-card" style={{ marginTop: "0.75rem" }}>
        {stats.recentlyUpdated.map((item) => (
          <li key={`${item.kind}-${item.slug}`}>
            <span className="admin-status">{item.kind}</span> · {item.title} · {new Date(item.updatedAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </>
  );
}
