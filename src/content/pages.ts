import type { L } from "@/lib/i18n";

export const home = {
  meta: {
    title: { bg: "ITT Digital Hub | Оптимизация на бизнес процеси и системи", en: "ITT Digital Hub | Process Optimization & Software Systems" },
    description: {
      bg: "Оптимизираме работни процеси, свързваме данни и системи и използваме автоматизация, специализиран софтуер и ИИ там, където носят практическа полза.",
      en: "We improve workflows, connect data and systems, and use automation, purpose-built software and AI where they are practically useful.",
    },
  },
  hero: {
    label: { bg: "Бизнес процеси · Данни · Системи", en: "Business processes · Data · Systems" },
    headline: {
      bg: "По-малко рутина.\nПовече време за важната работа.",
      en: "Less repetitive work.\nMore time for the work that matters.",
    },
    lead: {
      bg: "Помагаме на екипите да подредят информацията, да оптимизират работните процеси и да свържат системите си, така че по-малко време да отива в повтаряеми действия, а повече в работа, която изисква експертиза, преценка и решения.",
      en: "We help teams organize information, improve workflows and connect systems, so less time goes into repetitive tasks and more into work that needs expertise, judgment and decisions.",
    },
    support: {
      bg: "Използваме автоматизация, специализиран софтуер и ИИ там, където намаляват ръчната работа, съкращават времето за изпълнение или подобряват контрола.",
      en: "We use automation, purpose-built software and AI where they reduce manual work, shorten execution time or improve control.",
    },
    primary: { bg: "Вижте какво сме изградили", en: "See what we have built" },
    secondary: { bg: "Обсъдете вашия процес", en: "Discuss your process" },
    proofLabel: { bg: "Работа", en: "Work" },
  },
  experience: {
    heading: { bg: "Опит и сътрудничества", en: "Experience and collaboration" },
    lead: {
      bg: "Работата ни пресича различни отрасли и професионални среди.",
      en: "Our work crosses different industries and professional settings.",
    },
  },
  featured: {
    label: { bg: "Работа", en: "Work" },
    heading: { bg: "Системи, изградени около конкретен процес.", en: "Systems built around a specific process." },
    lead: {
      bg: "От гаранционна регистрация до управление на енергийни активи. Различни отрасли, една и съща логика: започваме от работата, която трябва да бъде свършена.",
      en: "From warranty registration to the management of energy assets. Different industries, the same logic: we start from the work that needs to be done.",
    },
    chainTitle: { bg: "Оперативен поток", en: "Operational flow" },
  },
  problems: {
    label: { bg: "Какво решаваме", en: "What we solve" },
    heading: { bg: "Къде най-често се губят време и капацитет.", en: "Where time and capacity are usually lost." },
    lead: {
      bg: "Технологията рядко е първият проблем. По-често работата се забавя от повтаряеми действия, разпръсната информация и системи, които не следват реалния процес.",
      en: "Technology is rarely the first problem. Work more often slows down because of repetitive tasks, scattered information and systems that do not follow the real process.",
    },
  },
  judgement: {
    label: { bg: "Принцип", en: "Principle" },
    heading: { bg: "Първо процесът. После технологията.", en: "Process first. Technology second." },
    lead: {
      bg: "Започваме с начина, по който работата се извършва днес: информацията, хората, решенията, системите и ограниченията.\n\nОткриваме къде се губят време, информация или контрол и определяме какво действително има смисъл да бъде променено.\n\nРешението може да бъде по-добър процес, интеграция, автоматизация, специализиран софтуер, ИИ или комбинация от тях.",
      en: "We start from how work is actually done today: the information, the people, the decisions, the systems and the constraints.\n\nWe look for where time, information or control is lost, and decide what is actually worth changing.\n\nThe right step may be a better process, an integration, automation, purpose-built software, AI, or a combination.",
    },
  },
  benefit: {
    label: { bg: "Полза", en: "Benefit" },
    heading: { bg: "Повече от спестено време", en: "More than time saved" },
    lead: {
      bg: "Когато една повтаряема дейност престане да отнема часове всяка седмица, ефектът не е просто по-бързо изпълнение.\n\nОсвободеният капацитет може да бъде използван за повече клиентска работа, по-добър контрол, анализ, планиране и решения, които изискват човешка експертиза.",
      en: "When a repeated activity stops taking hours every week, the effect is not only faster execution.\n\nThe capacity that comes free can go into more client work, better control, analysis, planning and decisions that need human expertise.",
    },
  },
  approach: {
    label: { bg: "Как работим", en: "How we work" },
    heading: { bg: "Разбираме. Проектираме. Изграждаме.", en: "Understand. Design. Build." },
    lead: {
      bg: "Един и същ екип следва процеса от първоначалния проблем до работещото решение.",
      en: "The same team follows the work from the original problem to a working solution.",
    },
  },
  people: {
    label: { bg: "Екип", en: "Team" },
    heading: { bg: "Бизнесът и инженерството на една маса.", en: "Business and engineering at the same table." },
    lead: {
      bg: "Работим заедно от дефинирането на проблема до реализацията. Така бизнес логиката, техническите ограничения и практическото изпълнение се разглеждат като части от една система.",
      en: "We work together from defining the problem through to delivery. Business logic, technical constraints and practical implementation are treated as parts of one system.",
    },
  },
  work: {
    label: { bg: "Контакт", en: "Contact" },
    heading: { bg: "Къде губите време, информация или контрол?", en: "Where are you losing time, information or control?" },
    lead: {
      bg: "Опишете процеса с няколко изречения. Ще преценим дали виждаме смислена възможност за подобрение и какъв би бил разумният следващ ход.",
      en: "Describe the process in a few sentences. We will assess whether there is a meaningful opportunity to improve it, and what a sensible next step could be.",
    },
  },
} as const;

export const contactForm = {
  name: { bg: "Име", en: "Name" },
  company: { bg: "Фирма", en: "Company" },
  phone: { bg: "Телефон", en: "Phone" },
  problem: { bg: "Опишете процеса или проблема", en: "Describe the process or the problem" },
  problemPlaceholder: {
    bg: "Коя дейност ви забавя, повтаря се твърде често или изисква прекалено много ръчна работа?",
    en: "Which activity slows you down, repeats too often, or takes too much manual work?",
  },
  send: { bg: "Изпрати казуса", en: "Send the enquiry" },
  sending: { bg: "Изпращане…", en: "Sending…" },
  success: {
    bg: "Получихме съобщението. Ще се свържем с вас.",
    en: "The message has been sent. We will get back to you as soon as possible.",
  },
  error: {
    bg: "Не успяхме да изпратим съобщението. Опитайте отново.",
    en: "We couldn’t send the message. Please try again.",
  },
  invalid: {
    bg: "Попълнете име и опишете процеса или проблема.",
    en: "Enter your name and describe the process or the problem.",
  },
  privacy: {
    bg: "Данните се използват само за отговор на запитването. Вижте",
    en: "We use these details only to reply to the enquiry. See",
  },
} as const;

export const about = {
  meta: {
    title: { bg: "Какво решаваме | ITT Digital Hub", en: "What we solve | ITT Digital Hub" },
    description: {
      bg: "Проблемите рядко започват от технологията. Обикновено започват от процес, който постепенно е станал по-сложен.",
      en: "Problems rarely start with technology. They usually start with a process that has gradually become more complex.",
    },
  },
  heading: { bg: "Проблемите рядко започват от технологията.", en: "Problems rarely start with the technology." },
  lead: {
    bg: "Обикновено започват от процес, който постепенно е станал по-сложен: повече хора, повече информация, повече системи и повече изключения.",
    en: "They usually start with a process that has gradually become more complex: more people, more information, more systems and more exceptions.",
  },
  improvement: {
    label: { bg: "Подобрение", en: "Improvement" },
    heading: { bg: "Как изглежда подобрението", en: "What improvement looks like" },
    lead: {
      bg: "По-малко прехвърляне и търсене. По-ясни правила. По-добра проследимост. По-малко зависимост от ръчни действия.\n\nИ най-важното: повече капацитет за работата, която създава стойност.",
      en: "Less handing work around and less searching. Clearer rules. Better traceability. Less dependence on manual steps.\n\nAnd, most importantly, more capacity for the work that creates value.",
    },
  },
} as const;

export const methodologyPage = {
  meta: {
    title: { bg: "Подход | ITT Digital Hub", en: "Approach | ITT Digital Hub" },
    description: {
      bg: "Разбираме, проектираме и изграждаме. Целта е работата след решението да се извършва по-добре.",
      en: "Understand, design and build. The aim is that the work is performed better afterwards.",
    },
  },
  heading: { bg: "Разбираме. Проектираме. Изграждаме.", en: "Understand. Design. Build." },
  lead: {
    bg: "Целта не е просто да създадем работещ софтуер. Целта е работата след него да се извършва по-добре.",
    en: "The aim is not simply to produce working software. The aim is that the work is performed better afterwards.",
  },
} as const;

export const toolsPage = {
  meta: {
    title: { bg: "Инструменти | ITT Digital Hub", en: "Tools | ITT Digital Hub" },
    description: {
      bg: "Нормативни източници, инженерни модели, отворени данни и ИИ, превърнати в практически работни инструменти.",
      en: "Regulations, engineering models, open data and AI, turned into practical working tools.",
    },
  },
  heading: { bg: "Инструменти за конкретна работа.", en: "Tools for specific work." },
  lead: {
    bg: "Не всеки проблем изисква голяма платформа. Тук показваме как нормативни източници, инженерни модели, отворени данни и ИИ могат да бъдат превърнати в практически работни инструменти.",
    en: "Not every problem needs a large platform. Here we show how regulations, engineering models, open data and AI can become practical working tools.",
  },
  support: {
    bg: "Подходът зависи от задачата. Някои от инструментите използват ИИ, други използват класически изчислителни модели и структурирани данни.",
    en: "The approach depends on the task. Some tools use AI. Others use deterministic models and structured data.",
  },
  open: { bg: "Отвори", en: "Open" },
} as const;

export const projectsPage = {
  meta: {
    title: { bg: "Работа | ITT Digital Hub", en: "Work | ITT Digital Hub" },
    description: {
      bg: "Работа, която започва от конкретен проблем: процесът, ограниченията и резултатът, който трябва да бъде подобрен.",
      en: "Work that starts from a specific problem: the process, the constraints and the result that should improve.",
    },
  },
  heading: { bg: "Работа, която започва от конкретен проблем.", en: "Work that starts from a specific problem." },
  lead: {
    bg: "Не тръгваме от технология и не търсим къде да я приложим. Започваме от процеса, ограниченията и резултата, който трябва да бъде подобрен.",
    en: "We do not start from a technology and look for somewhere to apply it. We start from the process, the constraints and the result that should improve.",
  },
  detail: {
    problem: { bg: "Проблемът", en: "The problem" },
    symptoms: { bg: "Наблюдавани фактори", en: "Observed factors" },
    question: { bg: "Въпросът", en: "The question" },
    objective: { bg: "Какво се изгражда", en: "What was built" },
    scope: { bg: "Обхват", en: "Scope" },
    methodology: { bg: "Роля на AI / софтуера", en: "Role of AI / software" },
    data: { bg: "Доказателства", en: "Evidence" },
    stakeholders: { bg: "Участници", en: "Actors" },
    architecture: { bg: "Архитектура", en: "Architecture" },
    architectureComponents: { bg: "Компоненти", en: "Components" },
    outputs: { bg: "Резултати", en: "Deliverables" },
    validation: { bg: "Валидиране", en: "Validation" },
    indicators: { bg: "Показатели", en: "Indicators" },
    success: { bg: "Критерий", en: "Success criterion" },
    successIntro: { bg: "Приоритет:", en: "Priority:" },
    variants: { bg: "Варианти", en: "Variants" },
    followUp: { bg: "Следваща фаза", en: "Follow-up" },
    proposedTo: { bg: "Предложено към", en: "Proposed to" },
    measured: { bg: "Измерени резултати", en: "Measured results" },
    measuredEmpty: { bg: "Няма публикувани измерени резултати.", en: "No published measured results." },
    statusNote: { bg: "Бележка за статуса", en: "Status note" },
    source: { bg: "Източник", en: "Source" },
    meta: { bg: "Данни за проекта", en: "Project data" },
    glance: { bg: "Накратко", en: "At a glance" },
    executive: { bg: "Резюме", en: "Executive layer" },
    detailed: { bg: "Подробности", en: "Detail" },
    proposition: { bg: "В едно изречение", en: "One-sentence proposition" },
    method: { bg: "Метод", en: "Method" },
    actors: { bg: "Участници", en: "Actors" },
    intended: { bg: "Предвидено", en: "Intended outputs" },
    expected: { bg: "Очаквано", en: "Expected outcomes" },
    contents: { bg: "Съдържание", en: "Contents" },
    intelligence: { bg: "Съдържание и интелигентност за представянето", en: "Content & performance intelligence" },
    measuredAreas: { bg: "Възможни бъдещи области за измерване", en: "Potential future measurement areas" },
    next: { bg: "Следваща стъпка", en: "Next step" },
  },
} as const;

export const insightsPage = {
  meta: {
    title: { bg: "Анализи", en: "Insights" },
    description: { bg: "ITT Digital Hub не поддържа публичен блог.", en: "ITT Digital Hub does not run a public blog." },
  },
  heading: { bg: "Анализи", en: "Insights" },
  lead: { bg: "Тази секция не е част от публичния сайт.", en: "This section is not part of the public site." },
} as const;

export const newsPage = {
  meta: {
    title: { bg: "Новини", en: "News" },
    description: { bg: "ITT Digital Hub не поддържа публични новини.", en: "ITT Digital Hub does not run a public news channel." },
  },
  heading: { bg: "Новини", en: "News" },
  lead: { bg: "Тази секция не е част от публичния сайт.", en: "This section is not part of the public site." },
  empty: { bg: "Няма публични новини.", en: "No public news." },
} as const;

export const peoplePage = {
  meta: {
    title: { bg: "За нас | ITT Digital Hub", en: "About | ITT Digital Hub" },
    description: {
      bg: "Бизнесът и инженерството на една маса, от дефинирането на проблема до реализацията.",
      en: "Business and engineering at the same table, from defining the problem through to delivery.",
    },
  },
  heading: {
    bg: "Бизнесът и инженерството на една маса.",
    en: "Business and engineering at the same table.",
  },
  lead: {
    bg: "Работим заедно от дефинирането на проблема до реализацията. Така бизнес логиката, техническите ограничения и практическото изпълнение се разглеждат като части от една система.",
    en: "We work together from defining the problem through to delivery. Business logic, technical constraints and practical implementation are treated as parts of one system.",
  },
  structure: {
    label: { bg: "Екип", en: "Team" },
    heading: {
      bg: "Две допълващи се роли.\nЕдин процес.",
      en: "Two complementary roles.\nOne process.",
    },
  },
  structureNote: {
    bg: "Единият фокус е върху бизнеса, процесите и това какво си струва да бъде променено. Другият е върху архитектурата, инженерното изпълнение и надеждната работа на системата. Работим заедно през целия проект, а не като отделни звена.",
    en: "One focus is the business, the processes and what is worth changing. The other is the architecture, the engineering and making the system work reliably. We work together throughout a project, not as separate handoffs.",
  },
  disciplines: { label: { bg: "Експертиза", en: "Expertise" }, heading: { bg: "Къде се допълваме", en: "Where we complement each other" } },
  team: { label: { bg: "Екип", en: "Team" }, heading: { bg: "Профили", en: "Profiles" } },
  teamEmpty: {
    bg: "Профилите се показват само с потвърдени имена.",
    en: "Profiles are shown only with confirmed names.",
  },
  expertiseLabel: { bg: "Експертиза", en: "Expertise" },
} as const;

export const workPage = {
  meta: {
    title: { bg: "Контакт | ITT Digital Hub", en: "Contact | ITT Digital Hub" },
    description: {
      bg: "Опишете процеса с няколко изречения. Ще преценим дали виждаме смислена възможност за подобрение.",
      en: "Describe the process in a few sentences. We will assess whether there is a meaningful opportunity to improve it.",
    },
  },
  heading: { bg: "Къде губите време, информация или контрол?", en: "Where are you losing time, information or control?" },
  lead: {
    bg: "Опишете процеса с няколко изречения. Ще преценим дали виждаме смислена възможност за подобрение и какъв би бил разумният следващ ход.",
    en: "Describe the process in a few sentences. We will assess whether there is a meaningful opportunity to improve it, and what a sensible next step could be.",
  },
  routes: { label: { bg: "Контакт", en: "Contact" }, heading: { bg: "Нисък праг", en: "Low friction" } },
  routeFields: {
    audience: { bg: "За кого", en: "Who" },
    problems: { bg: "Типични проблеми", en: "Typical problems" },
    modes: { bg: "Форми", en: "Forms" },
    partnerBrings: { bg: "Какво носите вие", en: "What you bring" },
    weBring: { bg: "Какво правим ние", en: "What we do" },
  },
  path: { label: { bg: "Как протича", en: "How it unfolds" }, heading: { bg: "От разговор до система", en: "From conversation to system" } },
  pathBody: {
    bg: "",
    en: "",
  },
  independence: { label: { bg: "Принцип", en: "Principle" }, heading: { bg: "Първо процесът. После технологията.", en: "Process first. Technology second." } },
  independenceBody: {
    bg: "Автоматизираме повторяемото, за да остане повече време за работата, която изисква човек.",
    en: "We automate what repeats, so more time remains for work that needs a person.",
  },
  contact: { label: { bg: "Контакт", en: "Contact" }, heading: { bg: "Запитване", en: "Enquiry" } },
} as const;

export const privacyPage = {
  meta: {
    title: { bg: "Поверителност", en: "Privacy" },
    description: { bg: "Информация за обработването на данни на този уебсайт.", en: "Information about data processing on this website." },
  },
  heading: { bg: "Поверителност", en: "Privacy" },
  back: { bg: "Назад", en: "Back" },
  body: {
    bg: [
      "Този уебсайт представя ITT Digital Hub и не изисква регистрация.",
      "Контактната форма събира име, фирма, телефон и описание на процеса или проблема, за да отговорим на запитването. Не използваме тези данни за маркетинг.",
      "Ако ползвате AI Act асистента или изтеглите комплекта, записваме име, служебен имейл, компания и роля, за да знаем с кого разговаряме. Маркетингово съгласие е отделно и не е задължително, за да продължите. Няма регистрация и няма потребителски акаунт.",
      "Сайтът може да използва Vercel Analytics за измерване без рекламни бисквитки и без идентификация на отделни посетители.",
      "Хостинг доставчикът може да обработва технически данни (например IP адрес и данни за заявката) в сървърни журнали за сигурност и стабилност, съгласно собствените си правила.",
      "Запитванията се приемат през контактната форма, публикувания имейл адрес и публикуваните телефонни номера. При промяна в обработването тази страница ще бъде актуализирана.",
    ],
    en: [
      "This website presents ITT Digital Hub and does not require registration.",
      "The contact form collects a name, company, phone and a description of the process or problem so we can reply. We do not use these details for marketing.",
      "If you use the AI Act assistant or download the kit, we store a name, work email, company and role so we know who we are speaking with. Marketing consent is separate and is not required to continue. There is no registration and no user account.",
      "The site may use Vercel Analytics for measurement without advertising cookies and without identifying individual visitors.",
      "The hosting provider may process technical data (such as IP address and request data) in server logs for security and stability, under its own policies.",
      "Enquiries are received through the contact form, the published email address and the published phone numbers. If data processing changes, this page will be updated.",
    ],
  },
} as const;

export type Localized = L;
