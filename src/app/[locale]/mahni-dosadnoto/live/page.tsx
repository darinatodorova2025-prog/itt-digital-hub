import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { MahniLiveScreen } from "@/mahni-dosadnoto/MahniLiveScreen";
import { getLiveInitialSnapshot } from "@/mahni-dosadnoto/server/initial-state";
import { getAdminSession, requireRole } from "@/lib/auth/session";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";
import type { EventPhase } from "@/mahni-dosadnoto/types";

// Live event data is request-specific; never statically cache this surface.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string }>; searchParams: Promise<{ pregled?: string }> };

/** Only the scene image required for the initial phase is preloaded. */
function sceneImageFor(phase: EventPhase): string | null {
  switch (phase) {
    case "ANALYZING":
      return "/event/mahni/grouping.webp";
    case "VOTING":
      return "/event/mahni/voting.webp";
    case "RESULTS":
    case "CLOSED":
      return "/event/mahni/aerial.webp";
    case "COLLECTING":
    case "FINALIZING":
    case "AI_JURY":
      return "/event/mahni/night.webp";
    default:
      return null;
  }
}

export default async function MahniLivePage({ params, searchParams }: Params) {
  const { locale: raw } = await params;
  const query = await searchParams;
  if (!isLocale(raw) || raw !== "bg") notFound();
  const preview = process.env.NODE_ENV !== "production" && query.pregled === "1";

  // Resolve the initial snapshot first. On a genuine store/error condition,
  // fall back to null so the client renders a neutral navy state with no
  // guessed phase or photograph.
  let snapshot: PublicLiveSnapshot | null = null;
  try {
    snapshot = await getLiveInitialSnapshot();
  } catch {
    snapshot = null;
  }

  const preload = snapshot ? sceneImageFor(snapshot.phase) : null;

  const operator = requireRole(await getAdminSession(), "editor");

  return (
    <>
      {preload ? <link rel="preload" as="image" href={preload} /> : null}
      <MahniLiveScreen initialSnapshot={snapshot} preview={preview} operator={operator} />
    </>
  );
}
