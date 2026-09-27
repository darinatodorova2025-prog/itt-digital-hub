import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n";
import { MahniLiveScreen } from "@/mahni-dosadnoto/MahniLiveScreen";

type Params = { params: Promise<{ locale: string }> };

const LIVE_IMAGES = [
  "/event/mahni/night.webp",
  "/event/mahni/grouping.webp",
  "/event/mahni/river.webp",
  "/event/mahni/aerial.webp",
];

export default async function MahniLivePage({ params }: Params) {
  const { locale: raw } = await params;
  if (!isLocale(raw) || raw !== "bg") notFound();
  return (
    <>
      {LIVE_IMAGES.map((href) => (
        <link key={href} rel="preload" as="image" href={href} />
      ))}
      <MahniLiveScreen />
    </>
  );
}
