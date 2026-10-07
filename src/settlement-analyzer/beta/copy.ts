import type { Locale } from "@/lib/i18n"

export function betaCopy(locale: Locale, trialLimit: number | null) {
  const bg = locale === "bg"
  return {
    unavailable: bg
      ? "Пробният анализ не може да започне, защото лимитът за Beta временно не може да се провери. Опитайте отново."
      : "The trial analysis cannot start because the Beta limit cannot be checked right now. Please try again.",
    inviteTitle: bg ? "Благодарим, че изпробвахте Beta версията." : "Thank you for trying the Beta.",
    inviteBody: bg
      ? ["След няколко анализа вече имате реално впечатление от инструмента.", "Вашата обратна връзка ще ни помогне да решим какво да подобрим и какво да разработим следващо.", "Отнема около 60 секунди."]
      : ["After a few analyses you have a real impression of the tool.", "Your feedback will help us decide what to improve and what to build next.", "It takes about 60 seconds."],
    giveFeedback: bg ? "Дайте обратна връзка" : "Give feedback",
    continueTrial: trialLimit == null ? "" : bg ? `Продължете до ${trialLimit} анализа` : `Continue to ${trialLimit} analyses`,
    alreadyCompleted: bg ? "Вече попълних анкетата" : "I have already completed the survey",
    entry: bg ? "Beta обратна връзка" : "Beta feedback",
    entryShort: bg ? "Обратна връзка" : "Feedback",
    entryDone: bg ? "✓ Обратната връзка е изпратена" : "✓ Feedback sent",
    entryDoneShort: bg ? "✓ Изпратена" : "✓ Sent",
    entryClaimed: bg ? "✓ Анкетата е отбелязана като попълнена" : "✓ Survey marked as completed",
    entryClaimedShort: bg ? "✓ Отбелязана" : "✓ Marked",
    completeTitle: bg ? "Благодарим ви!" : "Thank you!",
    completeBody: trialLimit == null
      ? ""
      : bg
        ? `Достигнахте максималния брой от ${trialLimit} пробни анализа в Beta версията.`
        : `You have reached the maximum of ${trialLimit} trial analyses in the Beta.`,
    completeThanks: bg
      ? "Благодарим, че изпробвахте инструмента и ни помогнахте да разберем как се използва в реална работа."
      : "Thank you for trying the tool and helping us understand how it is used in real work.",
    completeFeedback: bg
      ? "Вашето мнение ще ни помогне да решим какво да подобрим и какво да разработим следващо."
      : "Your opinion will help us decide what to improve and what to build next.",
    completeAck: bg ? "Благодарим и за обратната връзка." : "Thank you for the feedback as well.",
    limitTitle: bg ? "Достигнахте лимита за Beta версията" : "You have reached the Beta limit",
    limitBody: trialLimit == null
      ? []
      : bg
        ? [`Вече използвахте ${trialLimit} пробни анализа.`, "Благодарим, че изпробвахте инструмента."]
        : [`You have already used ${trialLimit} trial analyses.`, "Thank you for trying the tool."],
    contactCta: bg ? "Ако желаете, свържете се с нас" : "If you wish, contact us",
    close: bg ? "Затвори" : "Close",
    progress: (step: number, total: number) => `${step} / ${total}`,
    next: bg ? "Напред" : "Next",
    back: bg ? "Назад" : "Back",
    send: bg ? "Изпратете" : "Send",
    optional: bg ? "по желание" : "optional",
    otherPlaceholder: bg ? "Опишете накратко" : "Describe briefly",
    usefulness: bg ? "Колко полезен ви се струва този анализ за реалната ви работа?" : "How useful does this analysis seem for your real work?",
    usefulnessLow: bg ? "Изобщо не е полезен" : "Not useful at all",
    usefulnessHigh: bg ? "Много полезен" : "Very useful",
    intendedUse: bg ? "За какво бихте използвали подобен инструмент?" : "What would you use a tool like this for?",
    capabilities: bg ? "Какво трябва да има, за да го използвате в реален проект?" : "What would it need for you to use it on a real project?",
    timeSink: bg ? "Коя част от предпроектната работа ви отнема най-много време?" : "Which part of the pre-design work takes you the most time?",
    automation: bg ? "Ако можехте да автоматизирате или улесните още една дейност във вашата работа, коя би била тя?" : "If you could automate or simplify one more activity in your work, what would it be?",
    role: bg ? "Вашата роля:" : "Your role:",
    frequency: bg ? "Колко често организацията ви работи по подобни задачи?" : "How often does your organisation work on tasks like these?",
    stages: bg ? "В кои етапи от работата бихте използвали подобен инструмент?" : "At which stages of the work would you use a tool like this?",
    interest: bg ? "Имате ли интерес към подобно решение за вашата организация?" : "Are you interested in a solution like this for your organisation?",
    contactHeading: bg ? "Ако желаете, оставете контакт и ще се свържем с вас." : "If you wish, leave contact details and we will get in touch.",
    name: bg ? "Име" : "Name",
    organisation: bg ? "Организация" : "Organisation",
    email: bg ? "Служебен email" : "Work email",
    phone: bg ? "Телефон" : "Phone",
    topic: bg ? "Какво бихте искали да обсъдим?" : "What would you like to discuss?",
    thanksTitle: bg ? "Благодарим за обратната връзка." : "Thank you for the feedback.",
    thanksBody: bg
      ? "Вашите отговори ще ни помогнат да решим как да развиваме инструмента нататък."
      : "Your answers will help us decide how to develop the tool from here.",
    sendFailed: bg
      ? "Отговорите са запазени на това устройство, но не можаха да се изпратят. Опитайте отново."
      : "Your answers are kept on this device, but they could not be sent. Please try again.",
    disclosure: bg
      ? "Информацията от Beta използването и отговорите в анкетата се използват, за да подобрим продукта."
      : "Beta usage and survey answers are used to improve the product.",
    required: bg ? "Моля, изберете отговор, за да продължите." : "Please choose an answer to continue.",
    invalidEmail: bg ? "Въведете валиден служебен email или оставете полето празно." : "Enter a valid work email, or leave the field empty.",
  }
}
