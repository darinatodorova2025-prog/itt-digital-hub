import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** The first ВиК Проектант assistant stays in the codebase and is not shown on the site. */
export default function VikDesignerPage() {
  notFound();
}
