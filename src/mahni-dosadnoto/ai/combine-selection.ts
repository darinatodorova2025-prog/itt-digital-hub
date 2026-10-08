import { z } from "zod";
import { acceptedFormulationNote, resolveFormulationNote } from "./formulation";
import { completeClusteringJson } from "./clustering";

const combineSelectionSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1200).optional(),
    formulationNote: z.unknown().optional(),
  })
  .transform((value) => {
    const title = value.title.trim();
    const description = value.description && value.description.trim().length >= 10 ? value.description.trim() : `${title}. Обобщение на избраните идеи.`;
    return {
      title,
      description: description.slice(0, 1200),
      formulationNote: acceptedFormulationNote(value.formulationNote),
    };
  });

export const COMBINE_SELECTION_SYSTEM = `Ти събираш избрани идеи от българска ВиК конференция в една тема.
Върни само JSON с title, description и formulationNote.
title и description са на български и следват само подадените текстове.
formulationNote е 1–3 изречения: кои текстове са събрани и как е стигнато до формулировката.
Не добавяй имена, организации, числа или резултати, които ги няма в текстовете.
Не връщай повече от една тема.`;

export type CombineGroup = {
  title: string;
  rawIdeas: string[];
};

export function combineSelectionPrompt(groups: CombineGroup[]): string {
  const texts = groups.flatMap((group) => {
    const raw = group.rawIdeas.map((idea) => idea.trim()).filter((idea) => idea.length > 0);
    return raw.length > 0 ? raw : [group.title.trim()].filter((title) => title.length > 0);
  });
  return JSON.stringify({
    instruction: "Обедини всички подадени текстове в една тема.",
    texts,
  });
}

export async function combineSelection(
  groups: CombineGroup[],
  options: Parameters<typeof completeClusteringJson>[3] = {},
): Promise<{ title: string; description: string; formulationNote: string }> {
  const texts = groups.flatMap((group) => {
    const raw = group.rawIdeas.map((idea) => idea.trim()).filter((idea) => idea.length > 0);
    return raw.length > 0 ? raw : [group.title.trim()].filter((title) => title.length > 0);
  });
  const { data } = await completeClusteringJson(
    combineSelectionSchema,
    COMBINE_SELECTION_SYSTEM,
    combineSelectionPrompt(groups),
    options,
  );
  return {
    title: data.title,
    description: data.description,
    formulationNote: resolveFormulationNote(data.formulationNote, {
      title: data.title,
      description: data.description,
      isAiWildcard: texts.length === 0,
      sources: texts.map((body) => ({ body })),
    }),
  };
}
