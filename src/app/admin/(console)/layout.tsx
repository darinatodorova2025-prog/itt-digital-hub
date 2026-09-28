import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminSession } from "@/lib/auth/session";
import { cmsMode, hostedDemoStore } from "@/lib/cms/mode";
import { Mark } from "@/components/layout/Logo";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/insights", label: "Insights & news" },
  { href: "/admin/people", label: "Team" },
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/mahni-dosadnoto", label: "Махни досадното" },
];

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div style={{ padding: "0 0.5rem 1rem" }}>
          <Mark size={43} />
          <p className="admin-status" style={{ marginTop: "0.75rem" }}>
            ITT · {cmsMode()}
          </p>
        </div>
        <nav aria-label="Admin">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} style={{ display: "block", padding: "0.45rem 0.6rem" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <form action="/admin/logout" method="post" style={{ marginTop: "1.5rem", padding: "0 0.5rem" }}>
          <p className="admin-muted" style={{ color: "#b7c3d0" }}>
            {session.email} · {session.role}
          </p>
          <button type="submit" className="admin-btn secondary" style={{ marginTop: "0.75rem", width: "100%" }}>
            Log out
          </button>
        </form>
      </aside>
      <div className="admin-main">
        {hostedDemoStore() ? (
          <p className="admin-card" style={{ marginBottom: "1rem" }}>
            Hosted demo store. Changes here are temporary until Supabase is configured.
          </p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
