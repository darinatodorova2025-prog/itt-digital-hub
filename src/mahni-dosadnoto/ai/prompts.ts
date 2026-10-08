import { clusteringThemeBounds } from "../validation";

export const CLUSTERING_SYSTEM = `Ти си аналитик на процеси за българска ВиК/инженерна конференция.
Групирай реални проблеми от участници в ясни теми на български.
Броят на темите е зададен в заявката. Не създавай повече теми от идеите и не прави тема без реална идея.
Всяка тема: title, description (мин. 10 символа), ideaIds (само подадени UUID), formulationNote.
formulationNote е на български, 1–3 изречения: кои подадени идеи са обединени и как от техния текст е стигнато до title и description.
Не добавяй имена, организации, числа или резултати, които ги няма в подадените идеи.
Всяка идея е в точно една тема.
Не променяй текста на идеите.
След темите добави wildcard с title, description и formulationNote — AI предложение извън подадените идеи. В неговата formulationNote кажи, че не идва от подадена идея.`;

export function clusteringUserPrompt(ideas: Array<{ id: string; body: string; organization: string }>) {
  const { min, max } = clusteringThemeBounds(ideas.length);
  const band = min === max ? String(min) : `${min}–${max}`;
  return JSON.stringify({
    instruction: `Върни JSON с полета themes[] и wildcard. Направи ${band} теми. Всяка идея влиза в точно една тема. Всяка тема и wildcard включват formulationNote: как е стигнато до формулировката.`,
    ideas,
  });
}

export const JUDGE_PROMPTS = {
  business_value: `Оцени бизнес стойност: време, ресурси, качество, ръчен труд, организация. Класирай подадените теми.`,
  feasibility: `Оцени реализируемост с налични технологии и разумни усилия. Класирай подадените теми.`,
  innovation: `Оцени иновация: по-добър начин на работа с технологии/ИИ. Класирай подадените теми.`,
} as const;

export function juryUserPrompt(themes: Array<{ id: string; title: string; description: string; isAiWildcard: boolean }>) {
  const count = Math.min(3, themes.length);
  return JSON.stringify({
    instruction: `Върни JSON picks[] с точно ${count} елемента: themeId от подадените, уникален rank от 1 до ${count}, rationale.`,
    themes: themes.map(({ id, title, description, isAiWildcard }) => ({ id, title, description, isAiWildcard })),
  });
}
