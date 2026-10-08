export function clusteringUserPrompt(ideas: Array<{ id: string; body: string; role?: string; frequency?: string | null }>) {
  return JSON.stringify({
    instruction:
      "Няма целеви брой теми. Групирай само когато един кратък проблем е верен за всяка идея. Използвай body, role и frequency. Не използвай организация.",
    ideas: ideas.map((idea) => ({
      id: idea.id,
      body: idea.body,
      role: idea.role ?? "",
      frequency: idea.frequency ?? null,
    })),
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
