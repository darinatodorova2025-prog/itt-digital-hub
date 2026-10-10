import { NextResponse, type NextRequest } from "next/server";
import { refreshSupabaseSession } from "@/lib/cms/supabase-middleware";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";
import { allowPublicIndexing, isAlwaysNoIndexPath } from "@/lib/indexing";

/**
 * Locale routing:
 *  - "/"            → /bg (English is opt-in via /en and the language switcher)
 *  - "/about" etc.  → "/bg/about"
 *  - "/bg/…", "/en/…" pass through
 * Static assets and Next internals are excluded by the matcher.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1] ?? "";

  const pass = NextResponse.next({ request });
  if (!allowPublicIndexing() || isAlwaysNoIndexPath(pathname)) {
    pass.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (locales.includes(first as Locale) || pathname.startsWith("/admin") || pathname.startsWith("/preview")) {
    return refreshSupabaseSession(request, pass);
  }

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`;
  const redirect = NextResponse.redirect(url, 307);
  if (!allowPublicIndexing()) redirect.headers.set("X-Robots-Tag", "noindex, nofollow");
  return redirect;
}

export const config = {
  matcher: ["/((?!_next|api|ingest|icon.png|apple-icon.png|favicon.ico|robots.txt|sitemap.xml|opengraph-image|.*\\..*).*)"],
};
