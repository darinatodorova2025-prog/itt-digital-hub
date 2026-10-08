export type ExpectedIdea = { id: string; expectedCluster: string };

/** solution_first labels are not one problem. Merging them counts as a false merge. */
export function problemKey(idea: ExpectedIdea): string {
  return idea.expectedCluster === "solution_first" ? `solution_first:${idea.id}` : idea.expectedCluster;
}

export function falseMergeCount(groups: string[][], expected: Map<string, string>): number {
  let count = 0;
  for (const group of groups) {
    const keys = new Set(group.map((id) => expected.get(id)).filter((key): key is string => Boolean(key)));
    if (keys.size > 1) count += 1;
  }
  return count;
}

export function coverageComplete(groups: string[][], ideaIds: string[]): boolean {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const id of group) {
      if (seen.has(id)) return false;
      seen.add(id);
    }
  }
  return ideaIds.every((id) => seen.has(id)) && seen.size === ideaIds.length;
}
