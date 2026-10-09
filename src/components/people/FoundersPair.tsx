import type { Locale } from "@/lib/i18n";
import type { Person } from "@/content/types";
import { personEyebrow, personIntro, type PersonIntroVariant } from "@/content/people";
import { PersonPortrait, PersonPortraitPlate } from "./PersonPortrait";

export function FoundersPair({
  people,
  locale,
  variant = "card",
}: {
  people: Person[];
  locale: Locale;
  variant?: PersonIntroVariant;
}) {
  return (
    <div className="team-roster-wrap">
      <ul className="team-roster">
        {people.map((person) => {
          const name = person.name[locale];
          const eyebrow = personEyebrow(person, locale);
          const paragraphs = personIntro(person, locale, variant);
          const expertise = person.expertise[locale];
          return (
            <li key={person.slug} className="team-card surface-card flex h-full min-w-0 flex-col">
              <p className="label min-h-[1.35em]" {...(eyebrow ? {} : { "aria-hidden": true })}>
                {eyebrow ?? "\u00a0"}
              </p>
              <div className="team-portrait">
                {person.portrait ? (
                  <PersonPortrait
                    src={person.portrait.src}
                    alt={name}
                    objectPosition={person.portrait.objectPosition}
                  />
                ) : (
                  <PersonPortraitPlate />
                )}
              </div>
              <h3 className="team-name text-h3 text-ink">{name}</h3>
              <p className="team-role text-small text-pretty text-ink-2" {...(person.role ? {} : { "aria-hidden": true })}>
                {person.role?.[locale] ?? "\u00a0"}
              </p>
              <div className="team-bio flex-1 space-y-3 text-small text-pretty text-ink-2">
                {paragraphs.map((paragraph) => (
                  <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                ))}
              </div>
              {variant === "profile" && expertise.length ? (
                <p className="mt-auto pt-4 text-meta text-ink-3">{expertise.join(" · ")}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
