import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { logoutAction } from "../actions";
import { getAdminSession } from "@/lib/auth/session";
import { hostedDemoStore } from "@/lib/cms/mode";
import type { StaffRole } from "@/lib/cms/types";
import lockupOnDark from "../../../../public/brand/itt-lockup-compact-on-dark.png";
import AdminLoading from "./admin-loading";
import { AdminLinkPending, AdminPendingButton } from "./pending";

/** Same visual height as the site header compact lockup (`h-9`). */
const lockupHeight = 36;

const nav = [{ href: "/admin/mahni-dosadnoto", label: "Махни досадното" }];

function roleLabel(role: StaffRole): string {
  if (role === "admin") return "администратор";
  return "редактор";
}

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-nav">
        <div style={{ padding: "0 0.5rem 1rem" }}>
          <Image
            src={lockupOnDark}
            alt="ITT Digital Hub"
            height={lockupHeight}
            width={Math.round((lockupHeight * lockupOnDark.width) / lockupOnDark.height)}
            priority
            className="admin-lockup"
          />
        </div>
        <nav aria-label="Админ">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} style={{ display: "block", padding: "0.45rem 0.6rem" }}>
              {item.label}
              <AdminLinkPending />
            </Link>
          ))}
        </nav>
        <Suspense fallback={null}>
          <AdminAccount />
        </Suspense>
      </aside>
      <Suspense fallback={<div className="admin-main"><AdminLoading /></div>}>
        <AdminMain>{children}</AdminMain>
      </Suspense>
    </div>
  );
}

async function AdminAccount() {
  const session = await getAdminSession();
  if (!session) return null;

  return (
    <form action={logoutAction} style={{ marginTop: "1.5rem", padding: "0 0.5rem" }}>
      <p className="admin-muted" style={{ color: "#b7c3d0" }}>
        {session.email} · {roleLabel(session.role)}
      </p>
      <AdminPendingButton className="admin-btn secondary" style={{ marginTop: "0.75rem", width: "100%" }}>
        Изход
      </AdminPendingButton>
    </form>
  );
}

async function AdminMain({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="admin-main">
      {hostedDemoStore() ? (
        <p className="admin-card" style={{ marginBottom: "1rem" }}>
          Хоствано демо хранилище. Промените тук са временни, докато Supabase не бъде конфигуриран.
        </p>
      ) : null}
      {children}
    </div>
  );
}
