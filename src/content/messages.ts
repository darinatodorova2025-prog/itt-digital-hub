import type { Locale } from "@/lib/i18n";

import type { ProjectStatus } from "./types";

/** UI strings shared by components. Page copy lives in src/content/pages. */
export interface Messages {
  skipToContent: string;
  menu: string;
  openMenu: string;
  closeMenu: string;
  primaryNav: string;
  footerNav: string;
  language: string;
  languageFooter: string;
  languageMenu: string;
  stageReference: string;
  switchTo: string;
  home: string;
  readMore: string;
  viewAll: string;
  allProjects: string;
  allInsights: string;
  allNews: string;
  toProject: string;
  toMethodology: string;
  toPeople: string;
    teamUpcoming: string;
    toWorkWithUs: string;
  toAbout: string;
  status: string;
  type: string;
  domain: string;
  methodology: string;
  stage: string;
  stages: string;
  source: string;
  publishedOn: string;
  author: string;
  topics: string;
  relatedProjects: string;
  relatedInsights: string;
  conceptNote: string;
  workingConcept: string;
  newsItem: string;
  analysisItem: string;
  newsUpdate: string;
  diagramFallback: string;
  onThisPage: string;
  institutionalAnchor: string;
  notFoundTitle: string;
  notFoundBody: string;
  backHome: string;
  copyright: string;
  loopCloses: string;
  breadcrumb: string;
  adaptNote: string;
  theoreticalFramework: string;
  operationalMethodology: string;
  explorer: string;
  executive: string;
  atAGlance: string;
  detailedFramework: string;
  intendedOutputs: string;
  expectedOutcomes: string;
  youtubeTitle: string;
  youtubeWatch: string;
  heroVideoPause: string;
  heroVideoPlay: string;
  newsCarousel: string;
  newsPrevious: string;
  newsNext: string;
  viewMore: string;
  viewProject: string;
  storiesCarousel: string;
  storiesPrevious: string;
  storiesNext: string;
  partnersMarquee: string;
  stageStructure: string;
  stageLoop: string;
  statuses: Record<ProjectStatus, string>;
}

const messages: Record<Locale, Messages> = {
  bg: {
    skipToContent: "Към съдържанието",
    menu: "Меню",
    openMenu: "Отвори менюто",
    closeMenu: "Затвори менюто",
    primaryNav: "Основна навигация",
    footerNav: "Навигация в долния колонтитул",
    language: "Език",
    languageFooter: "Език, долен колонтитул",
    languageMenu: "Език, меню",
    stageReference: "Справочник на етапите",
    switchTo: "Switch to English",
    home: "Начало",
    readMore: "Прочетете",
    viewAll: "Всички",
    allProjects: "Всички проекти",
    allInsights: "Всички анализи",
    allNews: "Всички новини",
    toProject: "Към проекта",
    toMethodology: "Подходът",
    toPeople: "За нас",
    teamUpcoming: "ITT е двама души.",
    toWorkWithUs: "Контакт",
    toAbout: "Какво решаваме",
    status: "Статус",
    type: "Тип",
    domain: "Област",
    methodology: "Методология",
    stage: "Етап",
    stages: "Етапи",
    source: "Източник",
    publishedOn: "Дата",
    author: "Автор",
    topics: "Теми",
    relatedProjects: "Свързани проекти",
    relatedInsights: "Свързани анализи",
    conceptNote: "Концептуална бележка",
    workingConcept: "Работна концепция",
    newsItem: "Новина",
    analysisItem: "Анализ",
    newsUpdate: "Актуално",
    diagramFallback: "Текстово описание на диаграмата",
    onThisPage: "На тази страница",
    institutionalAnchor: "Категория",
    notFoundTitle: "Страницата не е намерена",
    notFoundBody: "Търсената страница не съществува или е преместена.",
    backHome: "Към началната страница",
    copyright: "Всички права запазени",
    loopCloses: "Цикълът се затваря",
    breadcrumb: "Навигационна пътека",
    adaptNote: "Адаптиране → ново проектиране",
    theoreticalFramework: "Теоретична рамка",
    operationalMethodology: "Оперативна методология",
    explorer: "Изследовател на методологията",
    executive: "Резюме",
    atAGlance: "Накратко",
    detailedFramework: "Подробна проектна рамка",
    intendedOutputs: "Предвидени продукти",
    expectedOutcomes: "Очаквани резултати",
    youtubeTitle: "Видео от YouTube",
    youtubeWatch: "Гледайте в YouTube",
    heroVideoPause: "Пауза",
    heroVideoPlay: "Пусни",
    newsCarousel: "Новини",
    newsPrevious: "Предишна новина",
    newsNext: "Следваща новина",
    viewMore: "Вижте повече",
    viewProject: "Вижте проекта",
    storiesCarousel: "Работа",
    storiesPrevious: "Предишна история",
    storiesNext: "Следваща история",
    partnersMarquee: "Опит и сътрудничества",
    stageStructure: "Структура",
    stageLoop: "Цикъл",
    statuses: {
      "pilot-concept": "Пилотна концепция",
      "proposed-mandate": "Предложен мандат",
      "in-development": "В разработка",
      "active-pilot": "Активен пилот",
      completed: "Завършен",
      production: "Продукция",
      "internal-rd": "Вътрешна разработка",
      "previous-professional": "Завършен проект",
      "client-project": "Клиентски проект",
    },
  },
  en: {
    skipToContent: "Skip to content",
    menu: "Menu",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    primaryNav: "Primary navigation",
    footerNav: "Footer navigation",
    language: "Language",
    languageFooter: "Language, footer",
    languageMenu: "Language, menu",
    stageReference: "Stage reference",
    switchTo: "Превключи на български",
    home: "Home",
    readMore: "Read",
    viewAll: "View all",
    allProjects: "All projects",
    allInsights: "All insights",
    allNews: "All news",
    toProject: "View the project",
    toMethodology: "The approach",
    toPeople: "About",
    teamUpcoming: "ITT is two people.",
    toWorkWithUs: "Contact",
    toAbout: "What we solve",
    status: "Status",
    type: "Type",
    domain: "Domain",
    methodology: "Methodology",
    stage: "Stage",
    stages: "Stages",
    source: "Source",
    publishedOn: "Date",
    author: "Author",
    topics: "Topics",
    relatedProjects: "Related projects",
    relatedInsights: "Related insights",
    conceptNote: "Concept note",
    workingConcept: "Working concept",
    newsItem: "News",
    analysisItem: "Analysis",
    newsUpdate: "Update",
    diagramFallback: "Text description of the diagram",
    onThisPage: "On this page",
    institutionalAnchor: "Category",
    notFoundTitle: "Page not found",
    notFoundBody: "The page you requested does not exist or has been moved.",
    backHome: "Back to the homepage",
    copyright: "All rights reserved",
    loopCloses: "The loop closes",
    breadcrumb: "Breadcrumb",
    adaptNote: "Adapt → redesign",
    theoreticalFramework: "Theoretical framework",
    operationalMethodology: "Operational methodology",
    explorer: "Methodology explorer",
    executive: "Executive summary",
    atAGlance: "At a glance",
    detailedFramework: "Detailed project framework",
    intendedOutputs: "Intended outputs",
    expectedOutcomes: "Expected outcomes",
    youtubeTitle: "YouTube video",
    youtubeWatch: "Watch on YouTube",
    heroVideoPause: "Pause",
    heroVideoPlay: "Play",
    newsCarousel: "News",
    newsPrevious: "Previous news item",
    newsNext: "Next news item",
    viewMore: "View more",
    viewProject: "View project",
    storiesCarousel: "Work",
    storiesPrevious: "Previous story",
    storiesNext: "Next story",
    partnersMarquee: "Experience and collaboration",
    stageStructure: "Structure",
    stageLoop: "Loop",
    statuses: {
      "pilot-concept": "Pilot concept",
      "proposed-mandate": "Proposed mandate",
      "in-development": "In development",
      "active-pilot": "Active pilot",
      completed: "Completed",
      production: "Production",
      "internal-rd": "Internal R&D",
      "previous-professional": "Completed project",
      "client-project": "Client project",
    },
  },
};

export function t(locale: Locale): Messages {
  return messages[locale];
}
