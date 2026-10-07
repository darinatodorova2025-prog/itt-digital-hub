import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";

type Params = { params: Promise<{ locale: string }> };

export default async function AiActPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  redirect(href(locale, "ai-act", "compare"));
}
