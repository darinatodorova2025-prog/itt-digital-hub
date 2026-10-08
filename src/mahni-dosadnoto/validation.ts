import { z } from "zod";
import { acceptedFormulationNote } from "./ai/formulation";
import { CONSENT_VERSION, IDEA_FREQUENCIES } from "./types";

const text = (max: number) => z.string().trim().min(1, "Задължително поле.").max(max);

export const registrationSchema = z.object({
  firstName: text(80),
  lastName: text(80),
  organization: text(160),
  role: text(120),
  email: z.string().trim().email("Невалиден имейл.").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
  recoveryEmail: z.string().trim().email().max(200).optional(),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

export const ideaSubmitSchema = z.object({
  body: text(500),
  frequency: z.enum(IDEA_FREQUENCIES).optional(),
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
});

export const voteSchema = z.object({
  themeId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(64).optional(),
});

export const interestSchema = z.object({
  themeId: z.string().uuid(),
});

export const followupSchema = z.object({
  themeId: z.string().uuid(),
});

function clusteringDescription(value: unknown, title: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length >= 10) return trimmed.slice(0, 1200);
  }
  const base = title.trim() || "Тема";
  return `${base}. Обобщение от AI кластеризация на подадените идеи.`.slice(0, 1200);
}

export const clusteringThemeSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.union([z.string(), z.null(), z.undefined()]).optional(),
    ideaIds: z.array(z.string().uuid()).min(1),
    formulationNote: z.unknown().optional(),
  })
  .transform(({ title, description, ideaIds, formulationNote }) => ({
    title,
    description: clusteringDescription(description, title),
    ideaIds,
    formulationNote: acceptedFormulationNote(formulationNote),
  }));

/**
 * Every theme must cite at least one submitted idea, and each idea belongs to one theme.
 * The theme count therefore cannot exceed the idea count.
 * A full room still targets 8–12 themes. A small rehearsal shrinks that band
 * instead of padding the result with empty groups.
 */
export function clusteringThemeBounds(ideaCount: number): { min: number; max: number } {
  const count = Math.max(0, Math.floor(ideaCount));
  if (count === 0) return { min: 1, max: 1 };
  const max = Math.min(12, count);
  const min = count >= 16 ? Math.min(8, max) : Math.min(max, Math.max(1, Math.ceil(count / 4)));
  return { min, max };
}

const clusteringWildcardSchema = z
  .object({
    title: z.string().min(3).max(200),
    description: z.union([z.string(), z.null(), z.undefined()]).optional(),
    formulationNote: z.unknown().optional(),
  })
  .transform(({ title, description, formulationNote }) => ({
    title,
    description: clusteringDescription(description, title),
    formulationNote: acceptedFormulationNote(formulationNote),
  }));

export function clusteringOutputSchemaFor(ideaCount: number) {
  const { min, max } = clusteringThemeBounds(ideaCount);
  return z.object({
    themes: z.array(clusteringThemeSchema).min(min).max(max),
    wildcard: clusteringWildcardSchema,
  });
}

export const clusteringOutputSchema = clusteringOutputSchemaFor(16);

export type ClusteringOutput = z.infer<typeof clusteringOutputSchema>;

export const juryPickSchema = z.object({
  themeId: z.string().uuid(),
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  rationale: z.string().min(10).max(800),
});

export type JuryOutput = {
  picks: Array<{ themeId: string; rank: 1 | 2 | 3; rationale: string }>;
};

/** Rank every available theme, and never ask for more than three. */
export function juryPickCount(themeCount: number): number {
  return Math.min(3, Math.max(0, Math.floor(themeCount)));
}

export function juryOutputSchemaFor(themeCount: number): z.ZodType<JuryOutput> {
  const count = juryPickCount(themeCount);
  const rank =
    count <= 1
      ? z.literal(1)
      : count === 2
        ? z.union([z.literal(1), z.literal(2)])
        : z.union([z.literal(1), z.literal(2), z.literal(3)]);
  return z.object({
    picks: z
      .array(
        z.object({
          themeId: z.string().uuid(),
          rank,
          rationale: z.string().min(10).max(800),
        }),
      )
      .length(Math.max(1, count)),
  });
}

export const juryOutputSchema = juryOutputSchemaFor(3);

export function validateClusteringAgainstIdeas(
  output: ClusteringOutput,
  ideaIds: Set<string>,
): { ok: true } | { ok: false; reason: string } {
  const seen = new Set<string>();
  for (const theme of output.themes) {
    for (const id of theme.ideaIds) {
      if (!ideaIds.has(id)) return { ok: false, reason: `Unknown idea id: ${id}` };
      if (seen.has(id)) return { ok: false, reason: `Duplicate idea id in themes: ${id}` };
      seen.add(id);
    }
  }
  for (const id of ideaIds) {
    if (!seen.has(id)) return { ok: false, reason: `Missing idea id in clustering: ${id}` };
  }
  return { ok: true };
}

export { CONSENT_VERSION };
