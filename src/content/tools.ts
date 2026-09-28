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
    title: { bg: "ВиК Проектант", en: "Water & Sewerage Designer" },
    category: { bg: "Инженерство · Нормативи", en: "Engineering · Regulations" },
    description: {
      bg: "Помага на ВиК проектанти да намират нормативни изисквания, да проследяват източниците и да правят изчисления по предоставените данни.",
      en: "Helps water and sewerage designers find regulatory requirements, follow the sources and calculate from the data they provide.",
    },
    image: { bg: "/tools/vik-proektant-card.jpg", en: "/tools/vik-proektant-card.jpg" },
    imageAlt: {
      bg: "Илюстрация на ВиК Проектант: нормативна уредба, водопровод и канализационна шахта.",
      en: "Water & Sewerage Designer illustration: a regulation, water pipes and a sewer manhole.",
    },
    hrefKey: "vik-proektant",
  },
  {
    id: "pipe-thermal-analysis",
    title: { bg: "Топлинен анализ на изолирана тръба", en: "Pipe Thermal Analysis" },
    category: { bg: "Инженерство · Изчисления", en: "Engineering · Models" },
    description: {
      bg: "Оценява как дебитът, изолацията, температурата и външните условия влияят върху изстиването на водата и риска от замръзване.",
      en: "Shows how flow, insulation, temperature and external conditions affect water cooling and the risk of freezing.",
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
    title: { bg: "AI Act Assistant", en: "AI Act Assistant" },
    category: { bg: "Регулации · ИИ", en: "Regulation · AI" },
    description: {
      bg: "Свързва текста на AI Act с конкретен професионален контекст, за да даде по-полезна отправна точка за работа с регламента.",
      en: "Connects the AI Act text with a specific professional context, so the regulation is easier to apply to a real case.",
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
    title: { bg: "Анализатор на населени места", en: "Settlement Analyzer" },
    category: { bg: "Данни · Пространствен анализ", en: "Data · Spatial analysis" },
    description: {
      bg: "Дава бърз ориентировъчен поглед върху застрояването, улиците, сградите, земеползването и други пространствени характеристики чрез отворени данни.",
      en: "An initial spatial view of a settlement from open data: built-up area, streets, buildings, land use and related features.",
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
