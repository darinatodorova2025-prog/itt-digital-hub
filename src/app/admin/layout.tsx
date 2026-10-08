import type { Metadata } from "next";
import type { ReactNode } from "react";
import { fontClassName } from "@/app/fonts";
import "./admin.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Махни досадното · Админ",
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bg" className={fontClassName}>
      <body className="admin-root">{children}</body>
    </html>
  );
}
