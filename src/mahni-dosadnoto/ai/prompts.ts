export const CLUSTERING_SYSTEM = `Ти си аналитик на процеси за българска ВиК/инженерна конференция.
Групирай реални проблеми от участници в ~10–12 ясни теми на български.
Всяка тема трябва да сочи само подадени ideaIds.
Не променяй текста на идеите.
След темите добави един AI Wildcard — изцяло генериран от теб, маркиран в отделно поле wildcard.`;

export function clusteringUserPrompt(ideas: Array<{ id: string; body: string; organization: string }>) {
  return JSON.stringify({
    instruction: "Върни JSON с полета themes[] и wildcard.",
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
