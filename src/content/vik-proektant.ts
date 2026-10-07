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

export type ScenarioGuide = {
  heading?: Record<Locale, string>;
  points: Array<Record<Locale, string>>;
};

export const scenarioGuides: Record<ExampleId, ScenarioGuide> = {
  "missing-information": {
    points: [
      { bg: "Разпознава, че данните не са достатъчни", en: "Recognises that the data is not enough" },
      { bg: "Не избира решение „на око“", en: "Does not choose a solution by eye" },
      { bg: "Иска точно необходимите уточнения", en: "Asks only for the clarifications that are needed" },
    ],
  },
  "source-requirement": {
    points: [
      { bg: "Търси нормативна опора", en: "Looks for a regulatory basis" },
      { bg: "Свързва извода с конкретния източник", en: "Ties the conclusion to the specific source" },
      { bg: "Не допълва липсващо правило", en: "Does not fill in a missing rule" },
    ],
  },
  calculation: {
    points: [
      { bg: "Подрежда входните данни", en: "Sets out the input data" },
      { bg: "Показва логиката на изчислението", en: "Shows the logic of the calculation" },
      { bg: "Посочва допусканията и резултата", en: "States the assumptions and the result" },
    ],
  },
  "design-reasoning": {
    points: [
      { bg: "Подрежда задачата професионално", en: "Structures the task professionally" },
      { bg: "Разделя данни, проверки и избор", en: "Separates the data, the checks and the choice" },
      { bg: "Предлага ясен следващ инженерен ход", en: "Proposes a clear next engineering step" },
    ],
  },
  ambiguous: {
    points: [
      { bg: "Разпознава повече от едно тълкуване", en: "Recognises more than one reading" },
      { bg: "Уточнява какво реално се пита", en: "Clarifies what is actually being asked" },
      { bg: "Не дава прибързан окончателен извод", en: "Does not jump to a final conclusion" },
    ],
  },
  "unsupported-rule": {
    points: [
      { bg: "Не приема твърдението без проверка", en: "Does not accept the claim without checking it" },
      { bg: "Търси реална нормативна опора", en: "Looks for a real regulatory basis" },
      { bg: "Коригира твърдението, ако такава липсва", en: "Corrects the claim when that basis is missing" },
    ],
  },
};

export const customScenarioGuide: ScenarioGuide = {
  heading: {
    bg: "При свободен въпрос следим за:",
    en: "For an open question, look for:",
  },
  points: [
    { bg: "Ясни допускания", en: "Clear assumptions" },
    { bg: "Проверима обосновка", en: "Reasoning that can be checked" },
    { bg: "Практически следващ ход", en: "A practical next step" },
  ],
};

export const vikProektant = {
  meta: {
    title: { bg: "ВиК Проектант", en: "Water & Sewerage Designer" },
    description: {
      bg: "Асистент за ВиК проектанти: изходни данни, нормативна справка, изчисление и ясни допускания.",
      en: "From the question to a verifiable engineering step: input data, the regulatory source, the calculation and the assumptions.",
    },
  },
  compareMeta: {
    title: { bg: "Сравнение · ВиК Проектант", en: "Compare · Water & Sewerage Designer" },
    description: {
      bg: "От въпроса до проверимия ход: нормативна справка, изчисление и ясни допускания.",
      en: "From the question to a step you can check: the regulatory source, the calculation and clear assumptions.",
    },
  },
  back: { bg: "Инструменти", en: "Tools" },
  label: { bg: "Инженерство · Нормативи", en: "Engineering · Regulations" },
  heading: { bg: "От въпроса до проверимия ход.", en: "From the question to a step you can check." },
  lead: {
    bg: "Асистент за ВиК проектанти, който следва професионална последователност: изходни данни, нормативна справка, изчисление и ясни допускания.",
    en: "An assistant for water and sewerage designers that follows a professional sequence: the input data, the regulatory source, the calculation and clear assumptions.",
  },
  support: {
    bg: "Когато липсва информация, пита. Когато използва нормативен източник, го посочва. Когато трябва да се получи число, показва как е получено.",
    en: "It asks when information is missing. It cites a source when one is used. When a number is required, it shows how that number was obtained.",
  },
  scopeTitle: { bg: "Какво покрива", en: "What it covers" },
  scopePoints: [
    {
      title: { bg: "Какво прави", en: "What it does" },
      text: {
        bg: "Помага при търсене в нормативни източници, структуриране на инженерния въпрос и извършване на изчисления по предоставените данни.",
        en: "It helps with searching regulatory sources, structuring the engineering question and calculating from the data provided.",
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
      title: { bg: "Какво не прави", en: "What it does not do" },
      text: {
        bg: "Не заменя проектанта, неговата професионална преценка или отговорността за крайното проектно решение. Не е официално тълкуване на нормативен акт. Част от формулите в изходните документи не са напълно извлечени. Пълните текстове на БДС и EN не са в базата.",
        en: "It does not replace the engineer, their professional judgment or responsibility for the final design. It is not an official interpretation of a regulation. Some formulas in the source documents were not fully extracted. The full texts of BDS and EN standards are not in the collection.",
      },
    },
  ],
  doesTitle: { bg: "Какво прави", en: "What it does" },
  does: {
    bg: "Помага при търсене в нормативни източници, структуриране на инженерния въпрос и извършване на изчисления по предоставените данни.",
    en: "It helps with searching regulatory sources, structuring the engineering question and calculating from the data provided.",
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
    bg: "Сравнява се общ отговор на езиков модел с отговор, който разполага със специализиран нормативен и професионален контекст. Самият модел не е необходимо да бъде различен.",
    en: "A general language-model answer is compared with an answer that has specialized regulatory and professional context. The model itself does not have to be different.",
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
    bg: "Не заменя проектанта, неговата професионална преценка или отговорността за крайното проектно решение. Не е официално тълкуване на нормативен акт. Част от формулите в изходните документи не са напълно извлечени. Пълните текстове на БДС и EN не са в базата.",
    en: "It does not replace the engineer, their professional judgment or responsibility for the final design. It is not an official interpretation of a regulation. Some formulas in the source documents were not fully extracted. The full texts of BDS and EN standards are not in the collection.",
  },
  compareCta: { bg: "Сравни отговорите", en: "Compare the answers" },
  compareHint: {
    bg: "Един въпрос. Два различни начина за работа с контекста.",
    en: "One question. Two different ways of working with the context.",
  },
  chatgptCta: { bg: "Отвори в ChatGPT", en: "Open in ChatGPT" },
  chatgptWaiting: {
    bg: "Връзката към ChatGPT се поставя след публикуване на плъгина. Дотогава сравнението на сайта показва същия специализиран ход.",
    en: "The ChatGPT link is added after the plugin is published. Until then, the on-site comparison shows the same specialized workflow.",
  },
  compare: {
    back: { bg: "Инструменти", en: "Tools" },
    returnTo: { bg: "Към Инструменти", en: "To Tools" },
    heading: { bg: "От въпроса до проверимия резултат.", en: "From the question to a result you can check." },
    lead: {
      before: {
        bg: "Асистент за ВиК проектанти, който следва професионална последователност: ",
        en: "An assistant for water and sewerage designers that follows a professional sequence: ",
      },
      terms: [
        { bg: "изходни данни", en: "the input data" },
        { bg: "нормативна справка", en: "the regulatory source" },
        { bg: "изчисление", en: "the calculation" },
        { bg: "ясни допускания", en: "clear assumptions" },
      ],
      between: { bg: ", ", en: ", " },
      lastBetween: { bg: " и ", en: " and " },
      after: { bg: ".", en: "." },
      when: [
        { bg: "Когато липсва информация, пита.", en: "When information is missing, it asks." },
        { bg: "Когато използва нормативен източник, го посочва.", en: "When a regulatory source is used, it cites it." },
        { bg: "Когато трябва да се получи число, показва как е получено.", en: "When a number is required, it shows how it was obtained." },
      ],
    },
    leadPoints: [
      {
        label: { bg: "Стандартен модел.", en: "Standard model." },
        text: { bg: "Без специализирана ВиК база.", en: "Without a specialized water and sewerage collection." },
      },
      {
        label: { bg: "ВиК асистент.", en: "Water and sewerage assistant." },
        text: { bg: "Специализирана база, инструкции и изчисления от ITT Digital Hub.", en: "A specialized collection, instructions and calculations from ITT Digital Hub." },
      },
    ],
    promptLabel: { bg: "Въпрос", en: "Question" },
    promptPlaceholder: {
      bg: "Напишете един въпрос за водоснабдяване, канализация или оразмеряване.",
      en: "Write one question about water supply, sewerage or sizing.",
    },
    examples: { bg: "Примерни случаи", en: "Example cases" },
    guideHeading: { bg: "Какво следим в отговора", en: "What to look for" },
    comparisonHeading: { bg: "Сравнение", en: "Comparison" },
    comparing: { bg: "Сравняваме отговорите...", en: "Comparing the answers..." },
    comparisonUnavailable: { bg: "Сравнението не е налично", en: "Comparison unavailable" },
    criteria: {
      grounding: { bg: "Обоснованост", en: "Grounding" },
      discipline: { bg: "Инженерна дисциплина", en: "Engineering discipline" },
      usefulness: { bg: "Практическа полезност", en: "Practical usefulness" },
    },
    bands: {
      weaker: { bg: "По-слаб", en: "Weaker" },
      neutral: { bg: "Без съществена разлика", en: "No material difference" },
      better: { bg: "По-добър", en: "Better" },
    },
    fairnessModel: { bg: "Един и същ модел", en: "Same model" },
    fairnessQuestion: { bg: "Един и същ въпрос", en: "Same question" },
    submit: { bg: "Сравни отговорите", en: "Compare the answers" },
    pending: { bg: "Сравнението тече", en: "Comparison in progress" },
    controlTitle: { bg: "Чист ИИ модел", en: "Plain AI model" },
    expertTitle: { bg: "ВиК Асистент", en: "Water and sewerage assistant" },
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
