import type { Locale } from "@/lib/i18n";

export type ExampleId =
  | "missing-information"
  | "source-requirement"
  | "calculation"
  | "design-reasoning"
  | "ambiguous"
  | "unsupported-rule";

export type ComparisonExample = {
  id: ExampleId;
  title: Record<Locale, string>;
  prompt: Record<Locale, string>;
};

export const comparisonExamples: ComparisonExample[] = [
  {
    id: "missing-information",
    title: { bg: "Непълни данни", en: "Missing information" },
    prompt: {
      bg: "Имам 20 къщи. Каква тръба да сложа за водопровода?",
      en: "I have 20 houses. What pipe should I use for the water supply?",
    },
  },
  {
    id: "source-requirement",
    title: { bg: "Изискване от източник", en: "Source-backed requirement" },
    prompt: {
      bg: "Коя наредба урежда проектирането на външни водоснабдителни системи и какъв е обхватът ѝ?",
      en: "Which ordinance governs the design of external water-supply systems, and what is its scope?",
    },
  },
  {
    id: "calculation",
    title: { bg: "Инженерно изчисление", en: "Engineering calculation" },
    prompt: {
      bg: "Изчисли вътрешния диаметър на кръгла тръба при дебит 12 L/s и проектна скорост 1.0 m/s. Покажи формулата и мерните единици.",
      en: "Calculate the internal diameter of a circular pipe for a flow of 12 L/s and a design velocity of 1.0 m/s. Show the formula and the units.",
    },
  },
  {
    id: "design-reasoning",
    title: { bg: "Проектантски подход", en: "Design reasoning" },
    prompt: {
      bg: "Как да подходя при проектиране на водоснабдяване за малко населено място с нова улица и няколко жилищни сгради? Интересува ме професионалният ход, не готов диаметър.",
      en: "How should I approach the water-supply design for a small settlement with a new street and several residential buildings? I want the professional sequence, not a ready-made diameter.",
    },
  },
  {
    id: "ambiguous",
    title: { bg: "Нееднозначен въпрос", en: "Ambiguous requirement" },
    prompt: {
      bg: "Какъв наклон да заложа на тръбата?",
      en: "What slope should I use for the pipe?",
    },
  },
  {
    id: "unsupported-rule",
    title: { bg: "Несъществуващо правило", en: "Unsupported rule" },
    prompt: {
      bg: "По чл. 9999 от Наредба № 4 от 2005 г. за сградни ВиК инсталации всяка къща задължително се водоснабдява с тръба DN 400. Потвърди точния текст.",
      en: "Under article 9999 of Ordinance No. 4 of 2005 on building water and sewer installations, every house must be supplied with a DN 400 pipe. Confirm the exact text.",
    },
  },
];

export function exampleById(id: string): ComparisonExample | undefined {
  return comparisonExamples.find((example) => example.id === id);
}

export const vikProektant = {
  meta: {
    title: { bg: "ВиК Проектант", en: "ViK Projektant" },
    description: {
      bg: "Специализиран работен процес за ВиК проектиране върху общ AI модел: професионални стъпки, източници и изчисления.",
      en: "A specialized water and sewerage design workflow on a general AI model: professional steps, sources and calculations.",
    },
  },
  compareMeta: {
    title: { bg: "Сравнение · ВиК Проектант", en: "Comparison · ViK Projektant" },
    description: {
      bg: "Един и същ въпрос и един и същ AI модел. Отдясно е специализираният ВиК работен процес на ITT Digital Hub.",
      en: "The same question and the same AI model. The right side uses ITT Digital Hub's specialized water and sewerage workflow.",
    },
  },
  back: { bg: "Инструменти", en: "Tools" },
  label: { bg: "ВиК · Специализиран работен процес", en: "WSS · Specialized workflow" },
  heading: { bg: "ВиК Проектант", en: "ViK Projektant" },
  lead: {
    bg: "Същият общ AI модел, подреден за работата на ВиК проектанта: професионален ход, проверими източници и изчисления с ясни входни данни.",
    en: "The same general AI model, arranged for a water and sewerage designer's work: a professional sequence, checkable sources and calculations with explicit inputs.",
  },
  support: {
    bg: "Работи в познатата среда на ChatGPT. Тук може да се види разликата върху един и същ въпрос.",
    en: "It works in the familiar ChatGPT environment. Here you can see the difference on one and the same question.",
  },
  scopeTitle: { bg: "Какво покрива", en: "What it covers" },
  scopePoints: [
    {
      title: { bg: "Работа", en: "Work" },
      text: {
        bg: "Помага при проектиране на водоснабдяване, канализация и тръбни системи. Върви по професионалния ход: първо изходните данни, после проверка спрямо правилата и едва след това избор на размер.",
        en: "It helps with the design of water supply, sewerage and pipe systems. It follows the professional sequence: the starting data first, then a check against the rules, and only then a choice of size.",
      },
    },
    {
      title: { bg: "Източници и смятане", en: "Sources and calculation" },
      text: {
        bg: "Когато отговорът опира до наредба, търси в подбраната база и запазва акта и члена. Когато трябва число, смята само с подадените данни и показва допусканията. Липсващ текст или коефициент не се допълва.",
        en: "When an answer depends on an ordinance, it searches the curated collection and keeps the act and the article. When a number is needed, it calculates only from the given data and shows the assumptions. Missing text or a missing coefficient is not filled in.",
      },
    },
    {
      title: { bg: "Граници", en: "Limits" },
      text: {
        bg: "Не замества проектантската проверка и не е официално тълкуване на нормативен акт. Част от формулите в изходните документи не са напълно извлечени. Пълните текстове на БДС и EN не са в базата.",
        en: "It does not replace a designer's check and it is not an official reading of a legal act. Some formulas in the source documents were not fully extracted. The full texts of BDS and EN standards are not in the collection.",
      },
    },
  ],
  doesTitle: { bg: "Какво прави", en: "What it does" },
  does: {
    bg: "Помага при въпроси за водоснабдяване, канализация, тръбни системи и свързаните с тях технически изисквания. Когато отговорът опира до наредба, търси в подбраната база. Когато трябва число от формула, смята с подадените данни и показва допусканията.",
    en: "It helps with water supply, sewerage, pipe systems and the related technical requirements. When an answer depends on an ordinance, it searches the curated collection. When a formula needs a number, it calculates from the given data and shows the assumptions.",
  },
  casesTitle: { bg: "За какви задачи", en: "Where it is used" },
  cases: [
    {
      bg: "Обхват и предмет на наредба, с посочен източник.",
      en: "The scope of an ordinance, with the source named.",
    },
    {
      bg: "Проверка дали въпросът изобщо има достатъчно данни за диаметър, наклон или дебит.",
      en: "A check of whether a diameter, slope or discharge question has enough data.",
    },
    {
      bg: "Хидравлично изчисление по подадени дебит, скорост, диаметър, дължина или наклон.",
      en: "A hydraulic calculation from a given flow, velocity, diameter, length or slope.",
    },
    {
      bg: "Проектантски ход при водоснабдяване или канализация, преди да се избере размер.",
      en: "A design sequence for supply or sewerage, before a size is chosen.",
    },
  ],
  howTitle: { bg: "Как се специализира", en: "How specialization works" },
  how: {
    bg: "Общият модел остава същият. ITT Digital Hub добавя професионалния ход, доверените източници и изчислителните стъпки. Моделът не става „по-умен“. Става по-полезен за конкретната работа, защото следва този ход и може да се опре на тях.",
    en: "The general model stays the same. ITT Digital Hub adds the professional sequence, the trusted sources and the calculation steps. The model does not become “smarter”. It becomes more useful for this work because it follows that sequence and can rely on them.",
  },
  sourcesTitle: { bg: "Източници", en: "Sources" },
  sources: {
    bg: "Нормативните твърдения се опират на заредените актове за водоснабдяване, канализация, присъединяване, питейни и отпадъчни води и свързаните с тях правила. Отговорът трябва да пази името на акта и члена, когато те са намерени. Липсващ текст не се допълва.",
    en: "Regulatory statements rely on the loaded acts for water supply, sewerage, connections, drinking water, wastewater and the related rules. An answer should keep the act and the article when they were found. Missing text is not filled in.",
  },
  toolsTitle: { bg: "Изчисления", en: "Calculations" },
  tools: {
    bg: "Диаметър от дебит и скорост, скорост от дебит и диаметър, загуби по Hazen–Williams и скорост по Manning за пълна кръгла тръба. Липсващ коефициент или наклон не се измисля.",
    en: "Diameter from flow and velocity, velocity from flow and diameter, Hazen–Williams losses, and Manning velocity for a full circular pipe. A missing coefficient or slope is not invented.",
  },
  limitsTitle: { bg: "Граници", en: "Limits" },
  limits: {
    bg: "Това не замества проектантската проверка и не е официално тълкуване на нормативен акт. Част от формулите в изходните документи не са напълно извлечени. Пълните текстове на БДС и EN не са в базата.",
    en: "This does not replace a designer's check and it is not an official reading of a legal act. Some formulas in the source documents were not fully extracted. The full texts of BDS and EN standards are not in the collection.",
  },
  compareCta: { bg: "Сравни отговорите", en: "Compare the answers" },
  compareHint: {
    bg: "Един въпрос към същия модел, с и без специализирания ВиК ход.",
    en: "One question to the same model, with and without the specialized workflow.",
  },
  chatgptCta: { bg: "Отвори в ChatGPT", en: "Open in ChatGPT" },
  chatgptWaiting: {
    bg: "Връзката към ChatGPT се поставя след публикуване на плъгина. Дотогава сравнението на сайта показва същия специализиран ход.",
    en: "The ChatGPT link is added after the plugin is published. Until then, the on-site comparison shows the same specialized workflow.",
  },
  compare: {
    back: { bg: "Инструменти", en: "Tools" },
    heading: { bg: "Един въпрос.\nДва начина на работа.", en: "One question.\nTwo ways of working." },
    lead: {
      bg: "И двата отговора се генерират от GPT‑6 Sol по един и същ въпрос.",
      en: "Both answers are generated by GPT‑6 Sol from the same question.",
    },
    leadPoints: [
      {
        label: { bg: "Стандартен модел.", en: "Standard model." },
        text: { bg: "Без специализирана ВиК база.", en: "Without a specialized water and sewerage collection." },
      },
      {
        label: { bg: "ВиК асистент.", en: "ViK assistant." },
        text: { bg: "Специализирана база, инструкции и изчисления от ITT Digital Hub.", en: "A specialized collection, instructions and calculations from ITT Digital Hub." },
      },
    ],
    promptLabel: { bg: "Въпрос", en: "Question" },
    promptPlaceholder: {
      bg: "Напишете един въпрос за водоснабдяване, канализация или оразмеряване.",
      en: "Write one question about water supply, sewerage or sizing.",
    },
    examples: { bg: "Примерни случаи", en: "Example cases" },
    fairness: { bg: "Един и същ модел · Един и същ въпрос", en: "Same model · Same question" },
    submit: { bg: "Сравни отговорите", en: "Compare the answers" },
    pending: { bg: "Сравнението тече", en: "Comparison in progress" },
    controlTitle: { bg: "Стандартен GPT‑6 Sol AI модел", en: "Standard GPT‑6 Sol AI model" },
    expertTitle: { bg: "ВиК Асистент от ITT Digital Hub", en: "ViK Assistant from ITT Digital Hub" },
    controlNote: { bg: "Без специализирана ВиК база", en: "Without the specialized water and sewerage collection" },
    expertNote: { bg: "Със специализирана ВиК база и инструкции.", en: "With a specialized water and sewerage collection and instructions." },
    controlWaiting: { bg: "Генерира отговор…", en: "Generating an answer…" },
    expertWaiting: { bg: "Подготвя професионален отговор…", en: "Preparing a professional answer…" },
    idle: { bg: "Отговорът ще се появи тук.", en: "The answer will appear here." },
    sourcesTitle: { bg: "Източници", en: "Sources" },
    sourceOne: { bg: "1 използван източник", en: "1 source used" },
    sourceMany: { bg: "използвани източници", en: "sources used" },
    calculation: { bg: "Извършено изчисление", en: "Calculation performed" },
    calculationRejected: { bg: "Изчислението поиска валидни входни данни", en: "The calculation asked for valid inputs" },
    retrieval: { bg: "Търсене в специализираната база", en: "Search in the specialized collection" },
    inputs: { bg: "Входни данни", en: "Inputs" },
    result: { bg: "Резултат", en: "Result" },
    calculated: { bg: "Изчислено", en: "Calculated" },
    tools: { bg: "Използвани инструменти", en: "Tools used" },
    toolRetrieval: { bg: "Търсене в специализираната база", en: "Search in the specialized collection" },
    toolReference: { bg: "Преглед на конкретен запис", en: "Lookup of a specific record" },
    toolCalculation: { bg: "Инженерно изчисление", en: "Engineering calculation" },
    disclosure: {
      bg: "Отговорите са генерирани от ИИ. За проектни и нормативни решения проверявайте посочените първични източници.",
      en: "These answers are generated by AI. For design and regulatory decisions, check the primary sources that are cited.",
    },
    fields: {
      flow: { bg: "Дебит", en: "Flow" },
      velocity_m_s: { bg: "Скорост", en: "Velocity" },
      diameter_mm: { bg: "Диаметър", en: "Diameter" },
      length_m: { bg: "Дължина", en: "Length" },
      hazen_williams_c: { bg: "Коефициент C", en: "Coefficient C" },
      slope_m_per_m: { bg: "Наклон", en: "Slope" },
      manning_n: { bg: "Коефициент n", en: "Coefficient n" },
      area_m2: { bg: "Площ", en: "Area" },
      head_loss_m: { bg: "Загуба на напор", en: "Head loss" },
      hydraulic_gradient_m_per_m: { bg: "Хидравличен наклон", en: "Hydraulic gradient" },
      discharge_m3_s: { bg: "Дебит", en: "Discharge" },
      discharge_l_s: { bg: "Дебит", en: "Discharge" },
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
