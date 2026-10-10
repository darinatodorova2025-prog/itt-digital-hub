import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseHost: string | undefined;
try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
} catch {
  supabaseHost = undefined;
}

const nextConfig: NextConfig = {
  env: {
    // VERCEL_ENV exists at build time but is not exposed to the browser by default.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "",
  },
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/api/ai-act/chat": ["./src/content/ai-act-kit/**/*"],
    "/api/ai-act/kit": ["./src/content/ai-act-kit/**/*"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/ingest/static/:path*", destination: "https://eu-assets.i.posthog.com/static/:path*" },
      { source: "/ingest/array/:path*", destination: "https://eu-assets.i.posthog.com/array/:path*" },
      { source: "/ingest/:path*", destination: "https://eu.i.posthog.com/:path*" },
    ];
  },
};

export default nextConfig;
