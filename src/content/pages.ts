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
    label: { bg: "Бизнес процеси · Софтуер · Автоматизация", en: "Business Processes · Software · Automation" },
    headline: {
      bg: "От конкретен проблем до работещо решение.",
      en: "From a real problem to a working solution.",
    },
    lead: {
      bg: "Помагаме на организациите да преодолеят затрудненията, които създават повтарящите се задачи, разпръснатата информация и несвързаните системи.",
      en: "We help organizations overcome the challenges created by repetitive tasks, scattered information and disconnected systems.",
    },
    support: {
      bg: "Разбираме как се върши работата, откриваме какво може да се подобри и избираме подходящото решение. Понякога това е по-добър процес, друг път интеграция, автоматизация, специализиран софтуер или ИИ.",
      en: "We understand how the work gets done, identify what can be improved and choose the right solution. Sometimes that means a better workflow, other times an integration, automation, purpose-built software or AI.",
    },
    primary: { bg: "Вижте какво сме изградили", en: "Explore our work" },
    secondary: { bg: "Нека поговорим", en: "Let's talk" },
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
    heading: { bg: "Къде работата се затруднява?", en: "Where does work get difficult?" },
    lead: {
      bg: "Понякога проблемът не е в отделен инструмент, а в начина, по който хората, информацията и системите работят заедно.",
      en: "Sometimes the problem is not one particular tool, but how people, information and systems work together.",
    },
  },
  judgement: {
    label: { bg: "Избор на решение", en: "Choosing the right solution" },
    heading: { bg: "Не всеки проблем изисква нова технология.", en: "Not every problem needs new technology." },
    lead: {
      bg: "Понякога е достатъчно да премахнем излишна стъпка, да свържем съществуващи инструменти или да подредим информацията. Друг път е необходимо да изградим нещо ново. Изборът зависи от задачата, а не от предварително предпочетена технология.",
      en: "Sometimes the right answer is to remove an unnecessary step, connect existing tools or organize information better. Other times, something new needs to be built. The choice depends on the problem, not on a preferred technology.",
    },
  },
  benefit: {
    label: { bg: "Резултат", en: "Results" },
    heading: { bg: "Как разбираме, че решението е по-добро?", en: "How do we know the solution is better?" },
    lead: {
      bg: "Проверяваме как се справя с реалната задача. Намалели ли са ръчните стъпки? Намира ли се информацията по-лесно? Работят ли системите по-добре заедно? Когато резултатът не е достатъчно добър, търсим какво трябва да се коригира.",
      en: "We evaluate it against the real task. Are there fewer manual steps? Is information easier to find? Do systems work better together? When the result falls short, we look at what needs to change.",
    },
  },
  approach: {
    label: { bg: "Как работим", en: "How we work" },
    heading: { bg: "Разбираме. Проектираме. Изграждаме.", en: "Understand. Design. Build." },
    lead: {
      bg: "Изясняваме задачата, избираме подходящото решение и проверяваме как работи на практика. При по-сложни или нови задачи можем да започнем с малък пилот, да оценим резултата и да направим необходимите корекции.",
      en: "We clarify the problem, choose the right approach and check how the solution performs in practice. For new or more complex challenges, we can start with a small pilot, evaluate the results and make adjustments before moving further.",
    },
  },
  people: {
    label: { bg: "Екип", en: "Team" },
    heading: { bg: "Различни компетентности. Един екип.", en: "Different expertise. One team." },
    lead: {
      bg: "Съчетаваме опит в бизнес процесите, софтуерната архитектура и разработката на приложения. Работим заедно от изясняването на задачата до техническата реализация.",
      en: "We bring together experience in business processes, software architecture and application development. We work together from understanding the problem through to technical implementation.",
    },
  },
  work: {
    label: { bg: "Контакт", en: "Contact" },
    heading: { bg: "Сещате ли се за процес, който може да работи по-добре?", en: "Can you think of a process that could work better?" },
    lead: {
      bg: "Не е необходимо да имате готово техническо задание. Разкажете ни какво ви затруднява или какво бихте искали да подобрите. Ще обсъдим дали можем да помогнем и каква би била разумната следваща стъпка.\n\nНека поговорим.",
      en: "You do not need a detailed technical brief. Tell us what is slowing you down or what you would like to improve. We can discuss whether we can help and what a sensible next step might be.\n\nLet's talk.",
    },
  },
} as const;

export const contactForm = {
  name: { bg: "Име", en: "Name" },
  company: { bg: "Фирма", en: "Company" },
  phone: { bg: "Телефон", en: "Phone" },
  problem: { bg: "Разкажете ни какво ви затруднява", en: "Tell us what is slowing you down" },
  problemPlaceholder: {
    bg: "Коя дейност ви забавя, повтаря се твърде често или изисква прекалено много ръчна работа?",
    en: "Which activity slows you down, repeats too often, or takes too much manual work?",
  },
  send: { bg: "Изпратете запитване", en: "Send an enquiry" },
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
      bg: "Допълващи се роли.\nЕдин процес.",
      en: "Complementary roles.\nOne process.",
    },
  },
  structureNote: {
    bg: "Бизнесът и процесите, архитектурата на решението и разработката на работещ продукт стоят заедно. Работим през целия проект, а не като отделни звена.",
    en: "Business and processes, the architecture of the solution and development of a working product sit together. We work together throughout a project, not as separate handoffs.",
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
