import type { ReactNode } from "react";
import "@/mahni-dosadnoto/styles.css";

export default function MahniLayout({ children }: { children: ReactNode }) {
  return <div className="md-root">{children}</div>;
}
