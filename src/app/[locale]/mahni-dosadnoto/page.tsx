import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { MahniParticipantApp } from "@/mahni-dosadnoto/MahniParticipantApp";
import { getParticipantInitialState } from "@/mahni-dosadnoto/server/initial-state";
import type { ParticipantInitialContext } from "@/mahni-dosadnoto/server/initial-state";
import type { PublicLiveSnapshot } from "@/mahni-dosadnoto/store/types";

// Live event data is request-specific; never statically cache this surface.
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = isLocale(raw) ? raw : "bg";
  if (locale !== "bg") notFound();
  return pageMetadata({
    locale,
    key: "mahni-dosadnoto",
    title: "Махни досадното · ITT Digital Hub",
    description: "Споделете какво ви губи време или може да се прави по-добре.",
  });
}

export default async function MahniDosadnotoPage({ params }: Params) {
  const { locale: raw } = await params;
  if (!isLocale(raw) || raw !== "bg") notFound();

  // Resolve initial state first. On a genuine store/error condition, fall back
  // to nulls so the client renders a neutral branded state — never a guessed
  // phase or the Welcome composition.
  let context: ParticipantInitialContext | null = null;
  let snapshot: PublicLiveSnapshot | null = null;
  try {
    const initial = await getParticipantInitialState();
    context = initial.context;
    snapshot = initial.snapshot;
  } catch {
    context = null;
    snapshot = null;
  }

  return <MahniParticipantApp initialContext={context} initialSnapshot={snapshot} />;
}
