import type { L, Locale } from "@/lib/i18n";
import type { Stage } from "./types";

/** Public working method. Not a consulting theatre of six stages. */
export const approachStages: Stage[] = [
  {
    code: "01",
    short: { bg: "Разбираме", en: "Understand" },
    title: { bg: "Разбираме", en: "Understand" },
    body: {
      bg: "Как се извършва работата днес? Къде се губят време, информация или контрол? Кои решения изискват човешка преценка и кои действия просто се повтарят?",
      en: "How is the work done today? Where are time, information or control lost? Which decisions need human judgment, and which actions simply repeat?",
    },
  },
  {
    code: "02",
    short: { bg: "Проектираме", en: "Design" },
    title: { bg: "Проектираме", en: "Design" },
    body: {
      bg: "Определяме най-подходящия начин процесът да бъде подобрен: чрез промяна в организацията на работата, интеграция, автоматизация, специализиран софтуер, ИИ или комбинация от тях.",
      en: "We decide how the process should improve: a change in how the work is organized, an integration, automation, purpose-built software, AI, or a combination.",
    },
  },
  {
    code: "03",
    short: { bg: "Изграждаме", en: "Build" },
    title: { bg: "Изграждаме", en: "Build" },
    body: {
      bg: "Реализираме решението, свързваме го със съществуващите системи и го проверяваме с реалните сценарии, за които е създадено.",
      en: "We build the solution and stay with it until it is in use. The people who understood the problem remain involved in making it work.",
    },
  },
];

export const approachName = {
  bg: "Разбираме · Проектираме · Изграждаме",
  en: "Understand · Design · Build",
} satisfies L;

/** CMS stores one string; never show the English phrase on `/bg`. */
export function localizedApproachName(value: L | string | undefined, locale: Locale): string {
  const bg = typeof value === "string" ? value : value?.bg ?? "";
  const en = typeof value === "string" ? value : value?.en ?? "";
  const blob = `${bg} ${en}`;
  if (/understand/i.test(blob) || /разбира/i.test(blob)) {
    return approachName[locale];
  }
  const localized = typeof value === "string" ? value : value?.[locale];
  return localized || approachName[locale];
}
