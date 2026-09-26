import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n";
import { pageMetadata } from "@/lib/metadata";
import { MahniParticipantApp } from "@/mahni-dosadnoto/MahniParticipantApp";

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
  return <MahniParticipantApp />;
}
