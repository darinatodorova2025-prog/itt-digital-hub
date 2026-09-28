import type { L } from "@/lib/i18n";
import type { Project } from "./types";
import { approachName } from "./approach";

const discussProject = {
  bg: "Обсъдете вашия процес",
  en: "Discuss your process",
} satisfies L;

const discussCreator = {
  bg: "Обсъдете вашата програма със създатели на съдържание",
  en: "Discuss your creator programme",
} satisfies L;

export const projects: Project[] = [
  {
    slug: "atn-warranty-portal",
    featured: true,
    status: "production",
    type: { bg: "Бизнес платформа", en: "Business platform" },
    domain: { bg: "Следпродажбено обслужване", en: "After-sales service" },
    methodologyName: approachName,
    title: {
      bg: "Гаранцията като директен канал към клиента",
      en: "Warranty as a direct channel to the customer",
    },
    standfirst: {
      bg: "Платформа за регистрация на продукт, проверка на покупката и управление на удължена гаранция, без необходимост производителят да променя съществуващия си дистрибуционен модел.",
      en: "A platform for product registration, purchase checks and extended warranty management, without the manufacturer having to change its distribution model.",
    },
    summary: {
      bg: "Платформа за регистрация, проверка на документи и управление на удължена гаранция, която създава директна връзка между производител и краен клиент.",
      en: "Registration, document checks and extended warranty management that create a direct relationship between the manufacturer and the end customer.",
    },
    tags: {
      bg: ["Удължена гаранция", "Проверка на документи", "Проследимост", "Директен канал"],
      en: ["Extended warranty", "Document checks", "Traceability", "Direct channel"],
    },
    cta: discussProject,
    proposition: {
      bg: "Гаранционната регистрация създава директен канал към крайния клиент, без производителят да променя дистрибуционния си модел.",
      en: "Warranty registration creates a direct channel to the end customer, without the manufacturer changing its distribution model.",
    },
    story: {
      challenge: {
        heading: { bg: "Проблемът", en: "The problem" },
        body: {
          bg: [
            "Когато продуктът достига до крайния клиент през дистрибутори и търговци, производителят често няма директна връзка с човека, който реално използва продукта.",
            "Гаранционната регистрация създава естествена причина за такава връзка, но ръчната проверка на документи и данни лесно превръща процеса в административно натоварване.",
          ],
          en: [
            "When a product reaches the end customer through distributors and retailers, the manufacturer often has no direct relationship with the person who actually uses it.",
            "Warranty registration is a natural reason for that relationship, but checking documents and data by hand quickly turns the process into an administrative burden.",
          ],
        },
      },
      built: {
        heading: { bg: "Решението", en: "The solution" },
        body: {
          bg: [
            "Клиентът регистрира продукта и предоставя информация за покупката. Системата извлича необходимите данни от документа, проверява правилата за допустимост и насочва неясните случаи за човешка проверка.",
            "Когато документът и въведените данни съвпадат, процесът продължава. Когато нещо липсва или е несъгласувано, клиентът е информиран и се създава случай за преглед. Операторите работят през система за обработка на случаи на настолен и мобилен уеб.",
          ],
          en: [
            "The customer registers the product and provides the purchase information. The system extracts the required data from the document, checks eligibility and sends unclear cases for human review.",
            "When the document and the entered data match, the process continues. When something is missing or inconsistent, the customer is told and a review case is opened. Operators work through a case system on desktop and mobile web.",
          ],
        },
        quote: {
          bg: "Ясните случаи минават през системата. Неясните остават за човешка проверка.",
          en: "Clear cases go through the system. Unclear cases stay with a person.",
        },
      },
      howItWorks: {
        heading: { bg: "Как работи", en: "How it works" },
        body: {
          bg: [
            "Регистрацията за клиента е на 6 езика за основните европейски пазари. Продуктовите данни се синхронизират със системите на производителя, така че новодобавените продукти да стават налични без повтаряща се ръчна поддръжка.",
            "Съгласието за маркетинг се обработва отделно от гаранционната регистрация. Ако клиентът даде съгласие, се използва отделен процес за потвърждение. Проследимостта и изискванията на GDPR са вградени в процеса.",
          ],
          en: [
            "The customer-facing journey supports 6 languages for key European markets. Product data is synchronised with the manufacturer's systems, so newly added products can become available without repetitive manual maintenance.",
            "Marketing consent is handled separately from warranty registration. If the customer opts in, a separate confirmation process is used. Traceability and GDPR requirements are built into the process.",
          ],
        },
        steps: {
          bg: [
            "Идентифициране на продукта",
            "Данни за клиента и покупката",
            "Качване на касова бележка или фактура",
            "Системата извлича данните от документа",
            "Сравнение с въведената дата и проверка на допустимостта",
            "Автоматично продължаване или случай за човешка проверка",
            "Потвърждение на гаранцията",
            "Отделно съгласие за комуникация",
          ],
          en: [
            "Identify the product",
            "Enter customer and purchase details",
            "Upload the receipt or invoice",
            "The system extracts the data from the document",
            "Compare dates and check eligibility",
            "Continue automatically, or open a human review case",
            "Warranty confirmation",
            "Separate marketing consent",
          ],
        },
      },
      value: {
        heading: { bg: "Директна връзка и пазарна видимост", en: "A direct relationship and market visibility" },
        body: {
          bg: [
            "Дистрибуционният модел остава непроменен: производител, дистрибутори, търговци, клиент. Платформата добавя паралелна директна връзка: производител, дигитална платформа, клиент.",
            "Производителят получава собствена видимост към реалните регистрации и клиентската активност: водещи държави и пазари, търговци и дистрибутори, регистрирани продукти, тенденции, обем на случаи, отворени и решени случаи, изключения и аудитория за комуникация със съгласие.",
            "Това показва къде реалната клиентска активност е най-силна и къде има смисъл да се насочат маркетинг, партньорска работа и търговско внимание. Клиентите, които изрично дадат съгласие, създават пряк канал към проверени собственици на продукта за новини, кампании и релевантна комуникация, без да се разчита единствено на дистрибутори и търговци.",
          ],
          en: [
            "The distribution model remains intact: manufacturer, distributors, retailers, customer. The platform adds a parallel direct relationship: manufacturer, digital platform, customer.",
            "The manufacturer gains first-party visibility into actual registrations and customer activity: leading countries and markets, retailers and distributors, registered products, trends, case volumes, open and resolved cases, exceptions and the consent-based communication audience.",
            "This shows where real customer activity is strongest and where marketing, partner work and commercial attention should go. Customers who explicitly opt in create a direct channel to verified product owners for product news, campaigns and relevant communication, without relying entirely on distributors or retailers.",
          ],
        },
        items: {
          bg: [
            "Водещи държави и пазари",
            "Водещи търговци и дистрибутори",
            "Най-регистрирани продукти",
            "Тенденции в регистрациите",
            "Обем, статус и изключения по случаи",
            "Аудитория за комуникация със съгласие",
          ],
          en: [
            "Top countries and markets",
            "Top retailers and distributors",
            "Top registered products",
            "Registration trends",
            "Case volumes, status and exceptions",
            "Consent-based communication audience",
          ],
        },
      },
      outcome: {
        heading: { bg: "Резултатът", en: "The result" },
        body: {
          bg: [
            "По-малко ръчна обработка за екипа и по-ясна проследимост на процеса.",
            "За производителя гаранцията се превръща и в директен канал към крайния клиент. Регистрацията остава многоезична, а пазарната видимост към държави, търговци, продукти и случаи се пази за екипа, който управлява процеса.",
          ],
          en: [
            "Less manual processing for the team, and clearer traceability.",
            "For the manufacturer, the warranty also becomes a direct channel to the end customer. Registration stays multilingual, and visibility of countries, retailers, products and cases stays with the team that runs the process.",
          ],
        },
      },
    },
    seo: {
      documentTitle: {
        bg: "Гаранцията като директен канал към клиента | ITT Digital Hub",
        en: "Warranty as a direct channel to the customer | ITT Digital Hub",
      },
      description: {
        bg: "Платформа за регистрация на продукт, проверка на покупката и управление на удължена гаранция, без промяна на дистрибуционния модел.",
        en: "Product registration, purchase checks and extended warranty management, without changing the distribution model.",
      },
      ogTitle: {
        bg: "Гаранцията като директен канал към клиента",
        en: "Warranty as a direct channel to the customer",
      },
      ogDescription: {
        bg: "Удължената гаранция като директен канал към крайния клиент, с по-малко ръчна обработка.",
        en: "Extended warranty as a direct channel to the end customer, with less manual processing.",
      },
      image: "/stories/warranty-journey.jpg",
    },
  },
  {
    slug: "ai-assisted-solar-operations",
    featured: false,
    status: "production",
    type: { bg: "Операционна система", en: "Operational system" },
    domain: { bg: "Възобновяема енергия", en: "Renewable energy" },
    methodologyName: approachName,
    title: {
      bg: "Управление на соларни паркове според пазарните условия",
      en: "Managing solar parks according to market conditions",
    },
    standfirst: {
      bg: "Управление според пазара, не само според производството. При енергийните активи максималното производство не винаги означава най-добрия икономически резултат.",
      en: "Manage according to the market, not production alone. For energy assets, maximum production does not always mean the best economic result.",
    },
    summary: {
      bg: "Система, която свързва производството с пазарните сигнали и подпомага по-доброто икономическо управление на активите.",
      en: "A system that connects production with market signals and supports better economic management of the assets.",
    },
    tags: {
      bg: ["Управление на ФЕЦ", "Батерийни системи", "Пазарна оптимизация"],
      en: ["Solar plant control", "Battery systems", "Market optimisation"],
    },
    proofPoint: {
      bg: "Внедрена в над 30 соларни парка",
      en: "Deployed across more than 30 solar parks",
    },
    cta: discussProject,
    proposition: {
      bg: "Производството се разглежда заедно с пазарните условия, а не само с техническия капацитет.",
      en: "Production is considered together with market conditions, not only with technical capacity.",
    },
    story: {
      challenge: {
        heading: { bg: "Проблемът", en: "The problem" },
        body: {
          bg: [
            "Производството трябва да бъде разглеждано заедно с пазарните условия, прогнозите, техническите ограничения и правилата за работа на конкретния актив.",
            "Цените на електроенергията се променят. В неблагоприятни периоди допълнителното производство може да влоши икономическия резултат, затова самото количество произведена енергия не е достатъчен ориентир.",
          ],
          en: [
            "Production has to be considered together with market conditions, forecasts, technical constraints and the operating rules of the specific asset.",
            "Electricity prices change. In unfavourable periods, extra production can worsen the economic result, so the amount of energy produced is not a sufficient guide on its own.",
          ],
        },
      },
      built: {
        heading: { bg: "Решението", en: "The solution" },
        body: {
          bg: [
            "Системата обединява необходимите сигнали и прилага предварително определена логика за реакция при различни пазарни и оперативни условия.",
            "Детерминираните правила остават в основата на критичните действия. ИИ може да се използва като допълнителен слой за анализ и подпомагане на решенията там, където това е подходящо.",
            "Платформата свързва фотоволтаичните централи и батерийните системи с пазарна информация от IBEX. Следи производството и състоянието на актива, може да адаптира, ограничи или временно спре производството според зададените правила и проследява приходите на интервали от 15 минути.",
          ],
          en: [
            "The system brings the necessary signals together and applies predefined logic for how to respond under different market and operating conditions.",
            "Deterministic rules remain the basis of critical actions. AI can be used as an additional layer for analysis and decision support where that is appropriate.",
            "The platform connects photovoltaic plants and battery systems with market information from IBEX. It monitors production and asset status, can adapt, limit or temporarily stop production according to the set rules, and tracks revenue in 15 minute intervals.",
          ],
        },
      },
      howItWorks: {
        heading: { bg: "Как работи", en: "How it works" },
        body: {
          bg: [
            "Фотоволтаичното производство и батерийното съхранение се управляват като свързани енергийни активи, които реагират на технически и пазарни условия.",
            "Критичните действия следват детерминирани правила. ИИ остава допълнителен слой за анализ върху натрупани оперативни и пазарни данни, когато това подпомага решението.",
          ],
          en: [
            "Photovoltaic production and battery storage are managed as connected energy assets that respond to technical and market conditions.",
            "Critical actions follow deterministic rules. AI stays an additional layer of analysis over accumulated operational and market data, where that supports the decision.",
          ],
        },
        quote: {
          bg: "Критичните действия остават върху детерминирани правила.",
          en: "Critical actions stay on deterministic rules.",
        },
      },
      value: {
        heading: { bg: "Икономическа ефективност", en: "Economic efficiency" },
        body: {
          bg: [
            "Операторите получават по-малко нужда от постоянно ръчно наблюдение и реакция. Собствениците получават по-ясна видимост към реалното представяне на активите и възможност да управляват производството според икономическия резултат, а не само според техническия капацитет.",
          ],
          en: [
            "Operators spend less time on constant manual monitoring and reaction. Owners gain clearer visibility into actual asset performance and the ability to manage production according to economic outcome, not technical capacity alone.",
          ],
        },
        items: {
          bg: [
            "Наблюдение на производството и състоянието на централата",
            "Управление на свързани батерийни системи",
            "Пазарни цени от IBEX",
            "Автоматична адаптация, ограничаване или спиране на производството",
            "Проследяване на приходи на 15 минути",
          ],
          en: [
            "Production and plant status monitoring",
            "Connected battery system management",
            "Market prices from IBEX",
            "Automatic adaptation, curtailment or stop",
            "Revenue tracking every 15 minutes",
          ],
        },
      },
      outcome: {
        heading: { bg: "Резултатът", en: "The result" },
        body: {
          bg: [
            "По-малко ръчно наблюдение и по-ясна връзка между пазарната ситуация и начина, по който активите се управляват.",
          ],
          en: [
            "Less manual monitoring, and a clearer link between the market situation and how the assets are managed.",
          ],
        },
      },
    },
    seo: {
      documentTitle: {
        bg: "Управление на соларни паркове според пазарните условия | ITT Digital Hub",
        en: "Managing solar parks according to market conditions | ITT Digital Hub",
      },
      description: {
        bg: "Система, която свързва производството с пазарните сигнали и подпомага икономическото управление на енергийните активи.",
        en: "A system that connects production with market signals and supports the economic management of energy assets. Deployed across more than 30 solar parks.",
      },
      ogTitle: {
        bg: "Управление на соларни паркове според пазарните условия",
        en: "Managing solar parks according to market conditions",
      },
      ogDescription: {
        bg: "По-ясна връзка между пазарната ситуация и управлението на активите.",
        en: "A clearer link between the market situation and how the assets are managed. Deployed across more than 30 solar parks.",
      },
      image: "/stories/solar-batteries-cover.jpg",
    },
  },
  {
    slug: "atn-creator-social-intelligence",
    featured: false,
    status: "production",
    type: { bg: "Бизнес платформа", en: "Business platform" },
    domain: { bg: "Създатели на съдържание", en: "Creator marketing" },
    methodologyName: approachName,
    title: {
      bg: "От разпръснати кампании към проследим процес",
      en: "From scattered campaigns to a traceable process",
    },
    standfirst: {
      bg: "С кого да работим? Какво договорихме? Какво беше доставено? Какво даде резултат и къде има смисъл да инвестираме следващия път?",
      en: "Who should we work with? What did we agree? What was delivered? What produced a result, and where does the next investment make sense?",
    },
    summary: {
      bg: "Единен процес за откриване, оценка, работа и анализ на създатели на съдържание.",
      en: "One process for finding, assessing, working with and analysing content creators.",
    },
    tags: {
      bg: ["Операции със създатели", "Сътрудничества", "Анализ на представянето", "Откриване"],
      en: ["Creator operations", "Collaborations", "Performance analysis", "Discovery"],
    },
    cta: discussCreator,
    proposition: {
      bg: "Единен процес свързва откриването, работата, доставките и анализа.",
      en: "One process connects discovery, the work, the deliveries and the analysis.",
    },
    story: {
      challenge: {
        heading: { bg: "Проблемът", en: "The problem" },
        body: {
          bg: [
            "При работа с много създатели на съдържание информацията лесно се разпределя между таблици, съобщения, договорки, платформи и отделни кампании.",
            "Тогава е трудно да се проследи с кого се работи, какво е договорено, какво е доставено и кой резултат дава основание за следваща инвестиция.",
          ],
          en: [
            "When a company works with many content creators, information easily spreads across spreadsheets, messages, agreements, platforms and separate campaigns.",
            "It then becomes hard to trace who is being worked with, what was agreed, what was delivered, and which result justifies the next investment.",
          ],
        },
      },
      built: {
        heading: { bg: "Решението", en: "The solution" },
        body: {
          bg: [
            "Единен процес свързва откриването и оценката на потенциални партньори, комуникацията, договорените ангажименти, доставеното съдържание и последващия анализ.",
            "ИИ подпомага задачи като търсене, класификация, обобщаване и сравнение, но самият модел не е центърът на системата.",
            "Публикуваното съдържание остава свързано със създателя, сътрудничеството, продукта, договорените доставки и данните за представяне.",
          ],
          en: [
            "One process connects the discovery and assessment of potential partners, the communication, the agreed commitments, the delivered content and the analysis that follows.",
            "AI supports tasks such as search, classification, summarization and comparison, but the model is not the centre of the system.",
            "Published content stays linked to the creator, the collaboration, the product, the agreed deliveries and the performance data.",
          ],
        },
        items: {
          bg: [
            "Профили на създатели и социални профили",
            "Управление на сътрудничества",
            "Доставки, продукти и възнаграждение",
            "Публикувано съдържание в бизнес контекст",
            "История на отношението и сравнение",
          ],
          en: [
            "Creator profiles and social profiles",
            "Collaboration management",
            "Deliverables, products and compensation",
            "Published content in business context",
            "Relationship history and comparison",
          ],
        },
      },
      howItWorks: {
        heading: { bg: "Как работи", en: "How it works" },
        body: {
          bg: [
            "Работният поток следва жизнения цикъл на отношението: откриване, оценка, сътрудничество, проследяване, измерване и учене.",
            "Платформата може да идентифицира създатели извън съществуващата партньорска мрежа, които вече се представят силно около релевантни продуктови категории. Това помага екипите да откриват бъдещи партньори по доказана релевантност и представяне, а не само по брой последователи.",
            "ИИ подпомага търсене, класификация, обобщаване и сравнение. Решението за следваща работа остава върху проследимия процес, не върху самия модел.",
          ],
          en: [
            "The workflow follows the relationship lifecycle: discover, evaluate, collaborate, track, measure and learn.",
            "The platform can identify creators outside the existing partner network who already perform strongly around relevant product categories. This helps teams discover potential future partners based on demonstrated relevance and performance, not simply follower count.",
            "AI supports search, classification, summarization and comparison. The decision about the next piece of work stays with the traceable process, not with the model itself.",
          ],
        },
        steps: {
          bg: ["Откриване", "Оценка", "Сътрудничество", "Проследяване", "Измерване", "Учене"],
          en: ["Discover", "Evaluate", "Collaborate", "Track", "Measure", "Learn"],
        },
      },
      value: {
        heading: { bg: "Пет свързани възможности", en: "Five connected capabilities" },
        body: {
          bg: [
            "Системата премества компанията от разпокъсано управление на създатели на съдържание към структуриран източник на оперативна и социална интелигентност.",
          ],
          en: [
            "The system moves the company from fragmented creator management to a structured source of creator and social intelligence.",
          ],
        },
        items: {
          bg: [
            "Един изглед към отношенията със създатели на съдържание",
            "Контрол върху сътрудничествата и доставките",
            "Връзка между публикуваното съдържание и неговия бизнес контекст",
            "Анализ на представянето по създатели, продукти и сътрудничества",
            "Откриване на нови релевантни създатели",
          ],
          en: [
            "One view of creator relationships",
            "Control over collaborations and deliverables",
            "Connection between published content and its business context",
            "Performance analysis across creators, products and collaborations",
            "Discovery of new relevant creators",
          ],
        },
        quote: {
          bg: "С кого да работим, какво договорихме, какво беше доставено, какво сработи и къде да инвестираме следващия път?",
          en: "Who should we work with, what did we agree, what was delivered, what worked and where should we invest next?",
        },
      },
      outcome: {
        heading: { bg: "Резултатът", en: "The result" },
        body: {
          bg: [
            "По-добра проследимост на целия цикъл и по-надеждна основа за следващите решения.",
          ],
          en: [
            "Clearer traceability across the whole cycle, and a more reliable basis for the next decisions.",
          ],
        },
      },
    },
    seo: {
      documentTitle: {
        bg: "От разпръснати кампании към проследим процес | ITT Digital Hub",
        en: "From scattered campaigns to a traceable process | ITT Digital Hub",
      },
      description: {
        bg: "Единен процес за откриване, оценка, работа и анализ на създатели на съдържание.",
        en: "One process for finding, assessing, working with and analysing content creators.",
      },
      ogTitle: {
        bg: "От разпръснати кампании към проследим процес",
        en: "From scattered campaigns to a traceable process",
      },
      ogDescription: {
        bg: "По-добра проследимост на цикъла и по-надеждна основа за следващите решения.",
        en: "Clearer traceability across the cycle, and a more reliable basis for the next decisions.",
      },
      image: "/stories/creator-content-library.jpg",
    },
  },
  {
    slug: "local-ai-orchestration",
    featured: false,
    status: "internal-rd",
    type: { bg: "Архитектура за изпълнение", en: "Execution architecture" },
    domain: { bg: "ИИ системи", en: "AI systems" },
    methodologyName: approachName,
    title: {
      bg: "Локална ИИ оркестрация",
      en: "Local AI orchestration",
    },
    standfirst: {
      bg: "Контрол върху това кой модел се използва, къде и защо. Не всяка задача трябва да бъде изпращана към един и същ облачен модел.",
      en: "Control over which model is used, where and why. Not every task should be sent to the same cloud model.",
    },
    summary: {
      bg: "Архитектура за комбиниране на локални и облачни модели според задачата, чувствителността на информацията, необходимото качество и разхода.",
      en: "An architecture for combining local and cloud models according to the task, the sensitivity of the information, the quality required and the cost.",
    },
    tags: {
      bg: ["Локални модели", "Облачни модели", "Оркестрация", "Контрол", "Инструменти"],
      en: ["Local models", "Cloud models", "Orchestration", "Control", "Tools"],
    },
    cta: discussProject,
    proposition: {
      bg: "Изборът на модел зависи от задачата, чувствителността на информацията, качеството и разхода.",
      en: "The choice of model depends on the task, the sensitivity of the information, the quality required and the cost.",
    },
    story: {
      challenge: {
        heading: { bg: "Подходът", en: "The approach" },
        body: {
          bg: [
            "Не всяка задача трябва да бъде изпращана към един и същ облачен модел.",
            "Архитектурата комбинира локални и облачни модели, инструменти, правила и състояние на процеса. В зависимост от задачата системата може да избере локална обработка или външен модел според необходимото качество, чувствителността на информацията и икономическата логика.",
          ],
          en: [
            "Not every task should be sent to the same cloud model.",
            "The architecture combines local and cloud models, tools, rules and the state of the process. Depending on the task, the system can choose local processing or an external model according to the quality required, the sensitivity of the information and the cost.",
          ],
        },
      },
      built: {
        heading: { bg: "Как е устроена", en: "How it is structured" },
        body: {
          bg: [
            "Оркестрационният слой анализира задачата, прилага правила за изпълнение, разбива работата и разпределя локални работници. Междинните резултати се оценяват, а прекъсната работа може да продължи от запазеното състояние.",
            "MCP осигурява контролиран достъп до инструменти, файлове и външни услуги. Оркестрационният слой остава отговорен за изпълнението.",
          ],
          en: [
            "The orchestration layer analyses the task, applies execution rules, breaks the work down and assigns local workers. Intermediate results are assessed, and interrupted work can continue from the saved state.",
            "MCP provides controlled access to tools, files and external services. The orchestration layer remains responsible for execution.",
          ],
        },
        items: {
          bg: [
            "Анализ на задачата и политика за изпълнение",
            "Устойчива многостъпкова работа",
            "Разпределение към локални работници",
            "Крайна проверка",
            "Избирателно използване на облака",
          ],
          en: [
            "Task analysis and execution policy",
            "Durable multi-step work",
            "Local worker dispatch",
            "Final verification",
            "Selective cloud use",
          ],
        },
        quote: {
          bg: "MCP осигурява достъп. Оркестрацията управлява изпълнението.",
          en: "MCP provides access. The orchestration layer runs the execution.",
        },
      },
      howItWorks: {
        heading: { bg: "Как работи", en: "How it works" },
        body: {
          bg: [
            "Локалното изпълнение може да даде по-голям контрол върху начина, по който се обработва информацията. Облачните модели могат да бъдат използвани при задачи, при които техните възможности са необходими и правилата за изпълнение го позволяват.",
            "Многостъпковата работа може да спре и да продължи. Системата запазва състоянието на задачата, така че прекъсване или рестарт не връща вече свършената работа в началото.",
            "Системата е проектирана да проверява дали работата действително е изпълнена, вместо да приема отговора на модела като достатъчно доказателство. Работниците получават нужния проектен контекст: структура, инструкции, умения и текущо състояние на работното пространство.",
          ],
          en: [
            "Local execution can provide greater control over how information is processed. Cloud models can be used for tasks where their capabilities are needed and the execution rules allow it.",
            "Multi-step work can pause and continue. The system keeps the state of the task, so an interruption or restart does not send finished work back to the beginning.",
            "The system is designed to check whether the work was actually completed, rather than treating the model's answer as sufficient proof. Workers receive the project context they need: structure, instructions, skills and the current state of the workspace.",
          ],
        },
        quote: {
          bg: "Локалното изпълнение може да даде по-голям контрол върху обработката на информацията.",
          en: "Local execution can provide greater control over how information is processed.",
        },
      },
      extras: [
        {
          heading: { bg: "Повече от избор на модел", en: "More than choosing a model" },
          body: {
            bg: [
              "Простата система за маршрутизиране избира модел и връща отговор. Тази архитектура управлява пътя на изпълнение: политика, оркестрация, локални работници, инструменти, оценка, проверка и резултат.",
              "Локалната обработка може да ограничи какъв контекст се изпраща навън. Външен модел получава само контекста, който задачата изисква, а използването на облака се определя от правила.",
              "Моделите и средите за изпълнение могат да се сменят според качество, производителност, цена и пригодност към задачата. Клиентите и процесите не трябва да се препроектират при всеки нов доставчик.",
            ],
            en: [
              "A simple routing system chooses a model and returns an answer. This architecture manages the path of execution: policy, orchestration, local workers, tools, assessment, verification and a result.",
              "Local processing can limit what context is sent out. An external model receives only the context the task requires, and cloud use is set by rules.",
              "Models and execution environments can change according to quality, performance, cost and fit for the task. Clients and processes do not have to be redesigned for every new provider.",
            ],
          },
          items: {
            bg: [
              "По-малко излишно използване на облака",
              "Повече чувствителен контекст остава локален",
              "Сложните задачи могат да продължат след прекъсване",
              "Работата се проверява, а не се приема на доверие",
              "Различни модели без зависимост от един доставчик",
              "Проектното знание може да се използва повторно",
              "Локална и облачна интелигентност се комбинират съзнателно",
            ],
            en: [
              "Less unnecessary cloud usage",
              "More of the sensitive context can stay local",
              "Complex tasks can continue after interruptions",
              "Work is verified instead of blindly trusted",
              "Different models can be used without vendor lock-in",
              "Project knowledge can be reused",
              "Local and cloud intelligence can be combined intentionally",
            ],
          },
        },
      ],
      value: {
        heading: { bg: "Къде се използва", en: "Where it is used" },
        body: {
          bg: [
            "Архитектурата се прилага върху вътрешни натоварвания в четири области.",
            "При измерени вътрешни натоварвания локално ориентираното изпълнение може значително да намали използването на облачни токени на ниво задача спрямо подходи, които разчитат основно на големи облачни модели. Това не е твърдение за същото намаление на общите оперативни разходи.",
          ],
          en: [
            "The architecture is applied to internal workloads in four areas.",
            "In measured internal workloads, locally oriented execution can substantially reduce task-level cloud-token usage compared with approaches that rely mainly on large cloud models. This is not a claim of the same reduction in total operating cost.",
          ],
        },
        items: {
          bg: [
            "Разработка и анализ на софтуер",
            "Проучване и работа със знания",
            "Анализ на документи и данни",
            "Автономни многостъпкови бизнес процеси",
          ],
          en: [
            "Software engineering and code analysis",
            "Research and knowledge work",
            "Document and data analysis",
            "Multi-step autonomous business workflows",
          ],
        },
      },
      outcome: {
        heading: { bg: "Защо", en: "Why" },
        body: {
          bg: [
            "Локалното изпълнение може да даде по-голям контрол върху начина, по който се обработва информацията, докато облачните модели могат да бъдат използвани при задачи, при които техните възможности са необходими.",
            "Многостъпковата работа пази състояние и се проверява спрямо задачата, вместо отговорът на модела да се приема за достатъчен резултат.",
          ],
          en: [
            "Local execution can provide greater control over how information is processed, while cloud models can be used for tasks where their capabilities are needed.",
            "Multi-step work keeps its state and is checked against the task, instead of treating the model's answer as a sufficient result.",
          ],
        },
      },
    },
    seo: {
      documentTitle: {
        bg: "Локална ИИ оркестрация | ITT Digital Hub",
        en: "Local AI orchestration | ITT Digital Hub",
      },
      description: {
        bg: "Архитектура за комбиниране на локални и облачни модели според задачата, чувствителността на информацията, качеството и разхода.",
        en: "An architecture for combining local and cloud models according to the task, the sensitivity of the information, the quality required and the cost.",
      },
      ogTitle: {
        bg: "Локална ИИ оркестрация",
        en: "Local AI orchestration",
      },
      ogDescription: {
        bg: "Контрол върху това кой модел се използва, къде и защо.",
        en: "Control over which model is used, where and why.",
      },
      image: "/stories/local-orchestration-cover.webp",
    },
  },
];

export const featuredProject = projects.find((p) => p.featured) ?? projects[0]!;
