import { redirect } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";

type Params = { params: Promise<{ locale: string }> };

/** The product introduction is folded into the comparison. This address only forwards. */
export default async function VikProektantPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  redirect(href(locale, "vik-proektant", "compare"));
}
