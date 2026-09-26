import type { Locale } from "@/lib/i18n";
import { vikProektant as copy } from "@/content/vik-proektant";
import { ArrowRight } from "@/components/ui/Icons";

/** One closed note. The comparison stays the page; this only opens on request. */
export function AssistantScope({ locale, chatGptUrl }: { locale: Locale; chatGptUrl: string | null }) {
  return (
    <details className="group mt-5">
      <summary className="flex w-fit cursor-pointer list-none items-center gap-2 text-small font-medium text-on-dark [&::-webkit-details-marker]:hidden">
        {copy.scopeTitle[locale]}
        <ArrowRight className="shrink-0 rotate-90 transition-transform duration-200 group-open:-rotate-90" />
      </summary>
      <div className="mt-3 grid gap-6 border-t border-on-dark/15 pt-4 text-small text-on-dark-muted md:grid-cols-3">
        {copy.scopePoints.map((point) => (
          <p key={point.title.en}>
            <strong className="font-medium text-on-dark">{point.title[locale]}.</strong> {point.text[locale]}
          </p>
        ))}
        {chatGptUrl ? (
          <p className="md:col-span-3">
            <a href={chatGptUrl} className="font-medium text-on-dark underline decoration-on-dark/40 underline-offset-4">
              {copy.chatgptCta[locale]}
            </a>
          </p>
        ) : null}
      </div>
    </details>
  );
}
