import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isLocale, locales, type Locale } from "@/lib/i18n";
import { site } from "@/content/site";

export const alt = "ITT Digital Hub";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Static Open Graph image per locale: name, descriptor, institutional anchor
 * and the supplied mark. Uses the Cyrillic-capable font files vendored for OG.
 */
export default async function OpenGraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  const [serif, sans, mark] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/og/SourceSerif4-Semibold.woff")),
    readFile(join(process.cwd(), "src/assets/og/IBMPlexSans-Regular.woff")),
    readFile(join(process.cwd(), "public/brand/itt-lockup-compact.png")),
  ]);
  const markSrc = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#ffffff",
          color: "#040e31",
          fontFamily: "Plex",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={markSrc} width={420} height={91} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ width: "100%", height: 1, background: "#dce2ee" }} />
          <div style={{ fontFamily: "Serif", fontSize: 44, lineHeight: 1.15, maxWidth: 1000 }}>{site.descriptor[locale]}</div>
          <div style={{ fontSize: 22, color: "#3a4660" }}>{site.anchor[locale]}</div>
        </div>
        <div style={{ position: "absolute", right: 72, bottom: 64, width: 14, height: 14, background: "#002cff" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Serif", data: serif, style: "normal", weight: 600 },
        { name: "Plex", data: sans, style: "normal", weight: 400 },
      ],
    },
  );
}
