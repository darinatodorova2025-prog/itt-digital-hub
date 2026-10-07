import { permanentRedirect } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { href } from "@/lib/paths";

type Params = { params: Promise<{ locale: string }> };

/** The product is the comparison. This address stays only so older links still arrive there. */
export default async function VikProektantPage({ params }: Params) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : "bg";
  permanentRedirect(href(locale, "vik-proektant", "compare"));
}
