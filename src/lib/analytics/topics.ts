export type TopicCategory =
  | "calculation"
  | "sewer"
  | "stormwater"
  | "water-supply"
  | "connection"
  | "materials"
  | "regulation"
  | "prohibited"
  | "high-risk"
  | "transparency"
  | "gpai"
  | "obligations"
  | "fines"
  | "scope"
  | "roles"
  | "other";

const VIK_RULES: Array<[TopicCategory, RegExp]> = [
  ["calculation", /изчисл|диамет|дебит|хидравл|напор|flow|diameter|hydraulic|calculat/i],
  ["sewer", /канализац|sewer|отпадъч|wastewater/i],
  ["stormwater", /дъжд|stormwater|storm water|rainwater|rain water/i],
  ["water-supply", /водоснаб|водопровод|питей|water supply|drinking water/i],
  ["connection", /присъедин|сградно отклонен|service connection|house connection/i],
  ["materials", /полиетилен|тръб|pvc|\bpe\b|material|pipe material/i],
  ["regulation", /норматив|наредб|член|regulation|ordinance|article/i],
];

const AI_ACT_RULES: Array<[TopicCategory, RegExp]> = [
  ["prohibited", /забран|prohibited|unacceptable/i],
  ["high-risk", /висок риск|high[- ]risk|annex iii/i],
  ["transparency", /прозрач|transparency|член 50|article 50/i],
  ["gpai", /gpai|общо предназначение|general[- ]purpose/i],
  ["fines", /санкц|глоб|fine|penalty/i],
  ["obligations", /задължен|obligation|provider|deployer|доставчик/i],
  ["roles", /рол|роля|role|responsibility|отговорност/i],
  ["scope", /обхват|scope|прилага|applies/i],
];

const EXAMPLE_TOPICS: Record<string, TopicCategory> = {
  calculation: "calculation",
  "source-requirement": "regulation",
  "missing-information": "other",
  "design-reasoning": "water-supply",
  ambiguous: "other",
  "unsupported-rule": "regulation",
  design: "scope",
  responsibility: "roles",
  "project-check": "obligations",
  infrastructure: "high-risk",
  roles: "roles",
  "article-4": "scope",
  "open-case": "other",
};

export function topicFromExample(exampleId: string | null | undefined): TopicCategory | null {
  if (!exampleId) return null;
  return EXAMPLE_TOPICS[exampleId] ?? null;
}

export function classifyTopic(toolId: string, text: string): TopicCategory {
  const rules = toolId === "ai-act-assistant" || toolId === "ai-act-agent" ? AI_ACT_RULES : VIK_RULES;
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) return category;
  }
  return "other";
}

export function topicForQuestion(toolId: string, text: string, exampleId?: string | null): TopicCategory {
  return topicFromExample(exampleId) ?? classifyTopic(toolId, text);
}
