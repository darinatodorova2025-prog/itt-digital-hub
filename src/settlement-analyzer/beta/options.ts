import type { BusinessInterest } from "./types"

export interface BetaOption {
  id: string
  bg: string
  en: string
}

export const INTENDED_USE_CASES: BetaOption[] = [
  { id: "preliminary_settlement", bg: "Предварителна оценка на населено място", en: "Preliminary settlement assessment" },
  { id: "pre_project", bg: "Подготовка преди ВиК проект", en: "Preparation before a water project" },
  { id: "compare_options", bg: "Избор и сравнение на варианти", en: "Choosing and comparing options" },
  { id: "site_check", bg: "Проверка на терен и застрояване", en: "Site and development check" },
  { id: "offer", bg: "Подготовка на оферта", en: "Preparing an offer" },
  { id: "client_talk", bg: "Разговор с клиент или възложител", en: "A conversation with a client or contracting authority" },
  { id: "would_not_use", bg: "Не бих го използвал", en: "I would not use it" },
  { id: "other", bg: "Друго", en: "Other" },
]

export const REQUESTED_CAPABILITIES: BetaOption[] = [
  { id: "existing_network", bg: "Данни за съществуваща ВиК мрежа", en: "Existing water-network data" },
  { id: "cadastre", bg: "Кадастър и имоти", en: "Cadastre and properties" },
  { id: "relief", bg: "По-точен релеф", en: "More accurate terrain" },
  { id: "population", bg: "Население и потребление", en: "Population and demand" },
  { id: "regulations", bg: "Нормативни проверки", en: "Regulatory checks" },
  { id: "calculations", bg: "Автоматични изчисления", en: "Automatic calculations" },
  { id: "routes", bg: "Варианти за трасета", en: "Route options" },
  { id: "quantities", bg: "Ориентировъчни количества и стойности", en: "Indicative quantities and costs" },
  { id: "cad_export", bg: "Експорт към CAD / GIS", en: "Export to CAD / GIS" },
  { id: "report", bg: "Автоматичен доклад / PDF", en: "Automatic report / PDF" },
  { id: "other", bg: "Друго", en: "Other" },
]

/** Compact list grounded in the current pre-design workflow the analyzer supports. */
export const TIME_SINKS: BetaOption[] = [
  { id: "source_data", bg: "Събиране на изходни данни", en: "Gathering source data" },
  { id: "site_check", bg: "Проверка на застрояване и терен", en: "Checking development and terrain" },
  { id: "demand_network", bg: "Оценка на потребление и мрежа", en: "Estimating demand and the network" },
  { id: "compare_options", bg: "Сравнение на варианти", en: "Comparing options" },
  { id: "offer", bg: "Подготовка на оферта", en: "Preparing an offer" },
  { id: "regulations", bg: "Нормативни проверки", en: "Regulatory checks" },
  { id: "other", bg: "Друго", en: "Other" },
]

export const ROLES: BetaOption[] = [
  { id: "water_designer", bg: "ВиК проектант", en: "Water designer" },
  { id: "engineer", bg: "Инженер", en: "Engineer" },
  { id: "operator", bg: "ВиК оператор", en: "Water operator" },
  { id: "consultant", bg: "Консултант", en: "Consultant" },
  { id: "contractor", bg: "Строител / изпълнител", en: "Contractor" },
  { id: "supplier", bg: "Доставчик / търговец", en: "Supplier / trader" },
  { id: "municipality", bg: "Община / публична организация", en: "Municipality / public organisation" },
  { id: "investor", bg: "Инвеститор / възложител", en: "Investor / contracting authority" },
  { id: "other", bg: "Друго", en: "Other" },
]

export const WORK_FREQUENCIES: BetaOption[] = [
  { id: "rarely", bg: "Рядко", en: "Rarely" },
  { id: "few_times_a_year", bg: "Няколко пъти годишно", en: "A few times a year" },
  { id: "monthly", bg: "Всеки месец", en: "Every month" },
  { id: "almost_constant", bg: "Почти постоянно", en: "Almost constantly" },
]

export const WORKFLOW_STAGES: BetaOption[] = [
  { id: "pre_design", bg: "Предпроектен анализ", en: "Pre-design analysis" },
  { id: "design", bg: "Проектиране", en: "Design" },
  { id: "regulations", bg: "Проверки и нормативи", en: "Checks and regulations" },
  { id: "calculations", bg: "Изчисления", en: "Calculations" },
  { id: "documentation", bg: "Документация", en: "Documentation" },
  { id: "operation", bg: "Експлоатация", en: "Operation" },
  { id: "whole_process", bg: "В целия процес", en: "Across the whole process" },
  { id: "other", bg: "Друго", en: "Other" },
]

export const BUSINESS_INTERESTS: Array<BetaOption & { value: BusinessInterest }> = [
  { id: "discuss", value: "discuss", bg: "Да, бих искал да обсъдим", en: "Yes, I would like to discuss it" },
  { id: "info", value: "info", bg: "Може би, изпратете ми повече информация", en: "Maybe, send me more information" },
  { id: "not_now", value: "not_now", bg: "Не засега", en: "Not for now" },
]

export function optionLabel(options: BetaOption[], id: string, locale: "bg" | "en") {
  return options.find((option) => option.id === id)?.[locale] ?? id
}

export function labelsFor(options: BetaOption[], ids: string[]) {
  const allowed = new Map(options.map((option) => [option.id, option.bg]))
  return ids.filter((id) => allowed.has(id)).map((id) => allowed.get(id) as string)
}

export function labelFor(options: BetaOption[], id: string) {
  return options.find((option) => option.id === id)?.bg ?? null
}
