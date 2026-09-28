import type { MahniStore } from "@/mahni-dosadnoto/store/types";
import { rankHumanThemes } from "@/mahni-dosadnoto/tie-break";

export type WinningThemeContacts = {
  rank: number;
  themeId: string;
  themeTitle: string;
  organizations: Array<{
    organization: string;
    contacts: Array<{ name: string; email: string; phone: string | null; marketingConsent: boolean }>;
  }>;
};

export async function computeWinningOrganizations(store: MahniStore): Promise<WinningThemeContacts[]> {
  const themes = await store.listThemes();
  if (themes.length === 0) return [];

  const votes = await store.listVotesAdmin();
  const voteCounts = new Map<string, number>();
  for (const vote of votes) voteCounts.set(vote.themeId, (voteCounts.get(vote.themeId) ?? 0) + 1);

  const ranked = rankHumanThemes(
    themes.map((theme) => ({
      theme,
      voteCount: voteCounts.get(theme.id) ?? 0,
      interestOrgCount: 0,
      submissionOrgCount: theme.organizationCount,
    })),
  );

  const participants = await store.listParticipantsAdmin();
  const participantById = new Map(participants.map((p) => [p.id, p]));
  const ideas = await store.listIdeasAdmin();
  const ideasById = new Map(ideas.map((i) => [i.id, i]));

  const results: WinningThemeContacts[] = [];

  for (const [idx, row] of ranked.slice(0, 3).entries()) {
    const ideaIds = await store.listThemeIdeaLinks(row.theme.id);
    const orgMap = new Map<string, WinningThemeContacts["organizations"][number]>();

    for (const ideaId of ideaIds) {
      const idea = ideasById.get(ideaId);
      if (!idea) continue;
      const participant = participantById.get(idea.participantId);
      const orgKey = idea.organization.trim().toLocaleLowerCase("bg-BG");
      if (!orgMap.has(orgKey)) {
        orgMap.set(orgKey, { organization: idea.organization, contacts: [] });
      }
      if (participant) {
        const bucket = orgMap.get(orgKey)!;
        if (!bucket.contacts.some((c) => c.email === participant.email)) {
          bucket.contacts.push({
            name: `${participant.firstName} ${participant.lastName}`,
            email: participant.email,
            phone: participant.phone,
            marketingConsent: participant.marketingConsent,
          });
        }
      }
    }

    results.push({
      rank: idx + 1,
      themeId: row.theme.id,
      themeTitle: row.theme.title,
      organizations: [...orgMap.values()],
    });
  }

  return results;
}
