import { clusteringThemeBounds } from "../validation";

export const CLUSTERING_SYSTEM = `Ти си аналитик на процеси за българска ВиК/инженерна конференция.
Групирай реални проблеми от участници в ясни теми на български.
Броят на темите е зададен в заявката. Не създавай повече теми от идеите и не прави тема без реална идея.
Всяка тема: title, description (мин. 10 символа), ideaIds (само подадени UUID).
Всяка идея е в точно една тема.
Не променяй текста на идеите.
След темите добави wildcard с title и description — AI предложение извън подадените идеи.`;

export function clusteringUserPrompt(ideas: Array<{ id: string; body: string; organization: string }>) {
  const { min, max } = clusteringThemeBounds(ideas.length);
  const band = min === max ? String(min) : `${min}–${max}`;
  return JSON.stringify({
    instruction: `Върни JSON с полета themes[] и wildcard. Направи ${band} теми. Всяка идея влиза в точно една тема.`,
    ideas,
  });
}

export const JUDGE_PROMPTS = {
  business_value: `Оцени бизнес стойност: време, ресурси, качество, ръчен труд, организация. Избери Top 3 теми.`,
  feasibility: `Оцени реализируемост с налични технологии и разумни усилия. Избери Top 3 теми.`,
  innovation: `Оцени иновация: по-добър начин на работа с технологии/ИИ. Избери Top 3 теми.`,
} as const;

export function juryUserPrompt(themes: Array<{ id: string; title: string; description: string; isAiWildcard: boolean }>) {
  return JSON.stringify({
    instruction: "Върни JSON picks[] с 3 елемента: themeId, rank (1-3), rationale.",
    themes: themes.map(({ id, title, description, isAiWildcard }) => ({ id, title, description, isAiWildcard })),
  });
}
