import type { L, Locale } from "@/lib/i18n";
import { href } from "@/lib/paths";

/** Localized catalogue row before a locale is applied. */
type ToolSource = {
  id: string;
  title: L;
  category: L;
  description: L;
  image: L;
  imageAlt: L;
  hrefKey?: "ai-act" | "ai-act-agent" | "settlement-analyzer" | "pipe-thermal-analysis" | "vik-designer" | "vik-proektant";
  status?: L;
  external?: boolean;
  /** Kept in source, omitted from the public catalogue. */
  hidden?: boolean;
  /** Extra path segment, so a card can open a nested page directly. */
  hrefSlug?: string;
};

export type ToolItem = {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  imageAlt: string;
  href?: string;
  status?: string;
  external?: boolean;
};

const catalog: ToolSource[] = [
  {
    id: "vik-proektant",
    title: { bg: "ВиК Проектант", en: "ViK Projektant" },
    category: { bg: "ВиК · Работен процес", en: "WSS · Workflow" },
    description: {
      bg: "Помага при въпроси за водоснабдяване и канализация. Намира изискванията в наредбите и смята по подадените данни.",
      en: "Helps with water supply and sewerage questions. Finds the requirements in the ordinances and calculates from the data you provide.",
    },
    image: { bg: "/tools/vik-proektant-card.jpg", en: "/tools/vik-proektant-card.jpg" },
    imageAlt: {
      bg: "Илюстрация на ВиК Проектант: нормативна уредба, водопровод и канализационна шахта.",
      en: "ViK Projektant illustration: a regulation, water pipes and a sewer manhole.",
    },
    hrefKey: "vik-proektant",
    hrefSlug: "compare",
  },
  {
    id: "pipe-thermal-analysis",
    title: { bg: "Топлинен анализ на тръбопроводи", en: "Pipe Thermal Analysis" },
    category: { bg: "Инженерство · Модели", en: "Engineering · Models" },
    description: {
      bg: "Анализира изстиването и топлинните загуби в изолиран PE тръбопровод и показва как температурата се променя с времето.",
      en: "Analyses cooling and heat loss in an insulated PE pipeline and shows how temperature changes over time.",
    },
    image: { bg: "/tools/pipe-thermal-analysis-hero.jpg", en: "/tools/pipe-thermal-analysis-hero.jpg" },
    imageAlt: {
      bg: "Изолиран полиетиленов тръбопровод върху стоманени опори.",
      en: "Insulated polyethylene pipeline on steel supports.",
    },
    hrefKey: "pipe-thermal-analysis",
  },
  {
    id: "ai-act-assistant",
    title: { bg: "Акт за изкуствения интелект", en: "AI Act Assistant" },
    category: { bg: "AI · Регулации", en: "AI · Regulation" },
    description: {
      bg: "Сравнява общ модел със специализиран асистент за Акта за изкуствения интелект: нормативен текст, роли и приложимост.",
      en: "Compares a general model with a specialist assistant for the Artificial Intelligence Act: the regulation, roles and applicability.",
    },
    image: { bg: "/tools/ai-act-assistant-card-bg.png", en: "/tools/ai-act-assistant-card-en.png" },
    imageAlt: {
      bg: "Интерфейс на асистента за Акта за изкуствения интелект с примерни въпроси и поле за въвеждане.",
      en: "AI Act Assistant interface with starter questions and an input field.",
    },
    hrefKey: "ai-act",
  },
  {
    id: "settlement-analyzer",
    title: { bg: "Предпроектен ВиК анализ", en: "Preliminary Water Infrastructure Analysis" },
    category: { bg: "ВиК · Територия", en: "Water · Territory" },
    description: {
      bg: "Начална пространствена картина на населено място преди подробен ВиК проект: застрояване, улици и релеф.",
      en: "An initial spatial picture of a settlement before detailed water-infrastructure design: development, streets and terrain.",
    },
    image: { bg: "/tools/settlement-analyzer-card-bg.png", en: "/tools/settlement-analyzer-card-en.png" },
    imageAlt: {
      bg: "Анализатор на населени места: карта и пространствени резултати.",
      en: "Settlement Analyzer: map and spatial results.",
    },
    hrefKey: "settlement-analyzer",
  },
  {
    id: "vik-designer",
    title: { bg: "ВиК Проектант", en: "WSS Designer" },
    category: { bg: "ВиК · Норми", en: "WSS · Rules" },
    description: {
      bg: "Нормативна справка за водоснабдяване, канализация, присъединяване и свързани изисквания.",
      en: "A normative lookup for water supply, sewerage, connections and related requirements.",
    },
    image: { bg: "/tools/vik-designer-card.svg", en: "/tools/vik-designer-card.svg" },
    imageAlt: {
      bg: "Техническа схема на водопроводна мрежа: магистрали, отклонения и възли.",
      en: "Technical drawing of a water network: mains, branches and nodes.",
    },
    hrefKey: "vik-designer",
    hidden: true,
  },
];

export function toolsFor(locale: Locale): ToolItem[] {
  return catalog.filter((item) => !item.hidden).map((item) => ({
    id: item.id,
    title: item.title[locale],
    category: item.category[locale],
    description: item.description[locale],
    image: item.image[locale],
    imageAlt: item.imageAlt[locale],
    href: item.hrefKey ? href(locale, item.hrefKey, item.hrefSlug) : undefined,
    status: item.status?.[locale],
    external: item.external,
  }));
}
