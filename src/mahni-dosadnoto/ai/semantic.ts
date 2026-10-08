export type SemanticIdea = {
  id: string;
  body: string;
  role: string;
  frequency: string | null;
};

export function toSemanticIdeas(
  ideas: Array<{ id: string; body: string; role: string; frequency: string | null }>,
): SemanticIdea[] {
  return ideas.map((idea) => ({
    id: idea.id,
    body: idea.body,
    role: idea.role,
    frequency: idea.frequency,
  }));
}
