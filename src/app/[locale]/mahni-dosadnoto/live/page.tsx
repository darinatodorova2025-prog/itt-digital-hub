import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { MahniLiveScreen } from "@/mahni-dosadnoto/MahniLiveScreen";

type Params = { params: Promise<{ locale: string }> };

export default async function MahniLivePage({ params }: Params) {
  const { locale: raw } = await params;
  if (!isLocale(raw) || raw !== "bg") notFound();
  return <MahniLiveScreen />;
}
