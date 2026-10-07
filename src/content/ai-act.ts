import type { Locale } from "@/lib/i18n";

export type ExampleId =
  | "design"
  | "responsibility"
  | "project-check"
  | "infrastructure"
  | "roles"
  | "article-4"
  | "open-case";

export type ComparisonExample = {
  id: ExampleId;
  title: Record<Locale, string>;
  prompt: Record<Locale, string>;
};

export const comparisonExamples: ComparisonExample[] = [
  {
    id: "design",
    title: { bg: "Проектиране с ИИ", en: "Design with AI" },
    prompt: {
      bg: "Използвам изкуствен интелект при оразмеряване и подготовка на техническа документация. Какви изисквания трябва да имам предвид?",
      en: "I use artificial intelligence when sizing and preparing technical documentation. What requirements should I keep in mind?",
    },
  },
  {
    id: "responsibility",
    title: { bg: "Отговорност на проектанта", en: "Designer responsibility" },
    prompt: {
      bg: "Ако използвам изкуствен интелект за предложение на техническо решение, какво трябва да имам предвид относно проверката и отговорността за крайния проект?",
      en: "If I use artificial intelligence to propose a technical solution, what should I consider about review and responsibility for the final design?",
    },
  },
  {
    id: "project-check",
    title: { bg: "Проверка на проект", en: "Design review" },
    prompt: {
      bg: "Използваме изкуствен интелект за автоматична проверка на инвестиционни проекти. Какво трябва да съобразим според Акта за изкуствения интелект?",
      en: "We use artificial intelligence to check investment designs automatically. What should we consider under the Artificial Intelligence Act?",
    },
  },
  {
    id: "infrastructure",
    title: { bg: "Управление на инфраструктура", en: "Infrastructure control" },
    prompt: {
      bg: "Система с изкуствен интелект автоматично управлява помпи и налягане във водоснабдителна мрежа. Кога подобна система може да попадне в категория с висок риск?",
      en: "An artificial-intelligence system automatically controls pumps and pressure in a water-supply network. When could such a system fall into a high-risk category?",
    },
  },
  {
    id: "roles",
    title: { bg: "Роли и задължения", en: "Roles and duties" },
    prompt: {
      bg: "Проектантска фирма използва външен модел с изкуствен интелект за анализ на документи и чертежи. Каква може да бъде ролята ѝ според Акта за изкуствения интелект?",
      en: "A design firm uses an external artificial-intelligence model to analyse documents and drawings. What role might it have under the Artificial Intelligence Act?",
    },
  },
  {
    id: "article-4",
    title: { bg: "Грамотност в областта на ИИ", en: "AI literacy" },
    prompt: {
      bg: "Какво изисква член 4 от организация, чиито инженери използват инструменти с изкуствен интелект в работата си?",
      en: "What does Article 4 require of an organisation whose engineers use artificial-intelligence tools in their work?",
    },
  },
  {
    id: "open-case",
    title: { bg: "Моят конкретен случай", en: "My specific case" },
    prompt: {
      bg: "Искам да използвам изкуствен интелект в проектантската си работа. Помогни ми да разбера какви изисквания могат да се прилагат.",
      en: "I want to use artificial intelligence in my design work. Help me understand which requirements may apply.",
    },
  },
];

export function exampleById(id: string): ComparisonExample | undefined {
  return comparisonExamples.find((example) => example.id === id);
}

export const aiAct = {
  meta: {
    title: { bg: "AI Act Assistant", en: "AI Act Assistant" },
    description: {
      bg: "От регламента към конкретния работен случай: текстът на AI Act, професионален контекст и ясни граници.",
      en: "From the regulation to the actual working case: the AI Act text, professional context and clear boundaries.",
    },
  },
  compareMeta: {
    title: { bg: "Сравнение · AI Act Assistant", en: "Comparison · AI Act Assistant" },
    description: {
      bg: "Същият модел. Същият въпрос. Различен контекст.",
      en: "The same model. The same question. A different context.",
    },
  },
  back: { bg: "Инструменти", en: "Tools" },
  returnTo: { bg: "Към AI Act Assistant", en: "To AI Act Assistant" },
  label: { bg: "Регулации · ИИ", en: "Regulation · AI" },
  heading: { bg: "От регламента към конкретния работен случай.", en: "From the regulation to the working case." },
  lead: {
    bg: "AI Act е общ регламент. Реалният въпрос е какво означава той за конкретна организация, професионална роля, процес или система. Асистентът работи с текста на регламента и допълнителен професионален контекст, за да направи търсенето и първоначалното ориентиране по-практични.",
    en: "The AI Act is a general regulation. The practical question is what it means for a specific organisation, professional role, process or system. The assistant works with the text of the regulation and additional professional context, so the first reading of a case is more useful.",
  },
  points: [
    {
      label: { bg: "Източник.", en: "Source." },
      text: { bg: "Отговорът се свързва с релевантните части от регламента.", en: "The answer is tied to the relevant parts of the regulation." },
    },
    {
      label: { bg: "Граници.", en: "Boundaries." },
      text: { bg: "Когато информацията не е достатъчна за надежден извод, това се посочва. Асистентът не класифицира система, когато решаващите факти липсват, и не допълва липсващ член.", en: "When the information is not enough for a reliable conclusion, that is said. The assistant does not classify a system when the deciding facts are missing, and it does not fill in a missing article." },
    },
  ],
  sections: [
    {
      title: { bg: "Източник", en: "Source" },
      body: {
        bg: "Отговорът се свързва с релевантните части от регламента: член, роля или дата, когато те са в заредения текст.",
        en: "The answer is connected to the relevant parts of the regulation: an article, a role or a date, when those are in the loaded text.",
      },
    },
    {
      title: { bg: "Контекст", en: "Context" },
      body: {
        bg: "Общото правило се разглежда спрямо конкретния въпрос и професионалната среда. Моделът може да е същият. Полезността идва от специализирания контекст и подбраната база от източници.",
        en: "The general rule is read against the specific question and the professional setting. The model can be the same. The usefulness comes from the specialized context and the selected source collection.",
      },
    },
    {
      title: { bg: "Граници", en: "Boundaries" },
      body: {
        bg: "Когато информацията не е достатъчна за надежден извод, това трябва да бъде ясно посочено. Инструментът не представлява правен съвет и не замества професионална правна консултация.",
        en: "When the information is not enough for a reliable conclusion, that should be stated clearly. The tool is not legal advice and does not replace professional legal counsel.",
      },
    },
  ],
  compareCta: { bg: "Сравни отговорите", en: "Compare responses" },
  audienceTitle: { bg: "При професионална работа", en: "In professional work" },
  audience: {
    bg: "Регламентът е общ. Тук примерите са за проектантски организации, инженери, инфраструктурни оператори, технически консултанти и смесени проектантски екипи. Професията не замества правния анализ.",
    en: "The regulation is general. The examples here are for design organisations, engineers, infrastructure operators, technical consultants and mixed design teams. A profession does not replace the legal analysis.",
  },
  compareHint: {
    bg: "Същият модел. Същият въпрос. Различен контекст.",
    en: "The same model. The same question. A different context.",
  },
  compare: {
    back: { bg: "Инструменти", en: "Tools" },
    returnTo: { bg: "Към Инструменти", en: "To Tools" },
    heading: { bg: "EU AI Act ВиК Асистент", en: "EU AI Act Water & Sewerage Assistant" },
    lead: {
      bg: "Сравнението показва как специализираният контекст и подбраната база от източници могат да променят полезността на отговора, без самият езиков модел непременно да бъде различен.",
      en: "The comparison shows how specialized context and a selected source collection can change how useful the answer is, without the language model itself having to be different.",
    },
    leadPoints: [
      {
        label: { bg: "Стандартен модел.", en: "Standard model." },
        text: { bg: "Без специализираната нормативна база.", en: "Without the specialized regulatory collection." },
      },
      {
        label: { bg: "Специализиран асистент.", en: "Specialist assistant." },
        text: { bg: "Нормативен текст и професионален контекст от ITT Digital Hub.", en: "The regulation and professional context from ITT Digital Hub." },
      },
    ],
    promptLabel: { bg: "Въпрос", en: "Question" },
    promptPlaceholder: {
      bg: "Напишете един въпрос за акта, за роля, за член или за конкретен случай.",
      en: "Write one question about the Act, a role, an article, or a specific situation.",
    },
    examples: { bg: "Примерни случаи", en: "Example cases" },
    fairness: { bg: "Един и същ модел · Един и същ въпрос", en: "Same model · Same question" },
    submit: { bg: "Сравни отговорите", en: "Compare responses" },
    pending: { bg: "Сравнението тече", en: "Comparison in progress" },
    controlTitle: { bg: "Стандартен модел", en: "Standard model" },
    expertTitle: { bg: "Специализиран асистент от ITT Digital Hub", en: "Specialist assistant from ITT Digital Hub" },
    controlNote: { bg: "Без специализираната нормативна база", en: "Without the specialized regulatory collection" },
    expertNote: { bg: "С нормативен текст и професионален контекст.", en: "With the regulation and professional context." },
    controlWaiting: { bg: "Генерира отговор…", en: "Generating an answer…" },
    expertWaiting: { bg: "Подготвя специализиран отговор…", en: "Preparing a specialized answer…" },
    idle: { bg: "Отговорът ще се появи тук.", en: "The answer will appear here." },
    sourcesTitle: { bg: "Източници", en: "Sources" },
    sourceOne: { bg: "1 използван източник", en: "1 source used" },
    sourceMany: { bg: "използвани източници", en: "sources used" },
    retrieval: { bg: "Търсене в специализираната база", en: "Search in the specialized collection" },
    tools: { bg: "Използвани инструменти", en: "Tools used" },
    toolRetrieval: { bg: "Търсене в нормативната база", en: "Search in the regulatory collection" },
    toolReference: { bg: "Преглед на конкретен запис", en: "Lookup of a specific record" },
    toolCatalogue: { bg: "Преглед на каталога", en: "Catalogue lookup" },
    kindLaw: { bg: "Нормативен източник", en: "Regulation" },
    kindGuidance: { bg: "Официални насоки", en: "Official guidance" },
    kindEngineering: { bg: "Професионален контекст", en: "Professional context" },
    kindNote: { bg: "Обяснение на ITT Digital Hub", en: "ITT Digital Hub explanation" },
    disclosure: {
      bg: "Инструментът не представлява правен съвет и не замества професионална правна консултация.",
      en: "The tool is not legal advice and does not replace professional legal counsel.",
    },
    unfair: {
      bg: "Сравнението не е показано като равностойно, защото услугата не потвърди един и същ модел за двете страни.",
      en: "The comparison is not presented as equivalent, because the service did not confirm the same model on both sides.",
    },
    errors: {
      timeout: { bg: "Тази страна не отговори в определеното време.", en: "This side did not answer within the time limit." },
      upstream: { bg: "Тази страна не можа да бъде изпълнена.", en: "This side could not be completed." },
      configuration: { bg: "Сравнението не е включено в тази среда.", en: "The comparison is not enabled in this environment." },
      model_mismatch: { bg: "Услугата върна друг модел. Резултатът не се показва.", en: "The service returned a different model. The result is hidden." },
      empty: { bg: "Няма текст за показване.", en: "There is no text to show." },
      rate_limited: { bg: "Твърде много сравнения за кратко време.", en: "Too many comparisons in a short time." },
      invalid_prompt: { bg: "Въведете въпрос до 4000 знака.", en: "Enter a question of up to 4000 characters." },
    },
  },
};
