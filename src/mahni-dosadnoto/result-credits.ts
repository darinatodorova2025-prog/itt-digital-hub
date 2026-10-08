export type ResultCredit = {
  organization: string;
  people: string[];
};

export function creditsByTheme(
  rows: Array<{ themeId: string; organization: string; person: string }>,
): Map<string, ResultCredit[]> {
  const byTheme = new Map<string, Map<string, ResultCredit>>();
  for (const row of rows) {
    const organization = row.organization.trim();
    if (!organization) continue;
    const person = row.person.trim();
    if (!byTheme.has(row.themeId)) byTheme.set(row.themeId, new Map());
    const orgs = byTheme.get(row.themeId)!;
    const key = organization.toLocaleLowerCase("bg-BG");
    if (!orgs.has(key)) orgs.set(key, { organization, people: [] });
    const bucket = orgs.get(key)!;
    if (person && !bucket.people.includes(person)) bucket.people.push(person);
  }
  return new Map([...byTheme].map(([themeId, orgs]) => [themeId, [...orgs.values()]]));
}
