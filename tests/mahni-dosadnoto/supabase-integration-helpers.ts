import { createSupabaseServiceClient } from "@/lib/cms/supabase-service";

export const MAHNI_INTEGRATION_CAMPAIGN_SLUG_PREFIX = "mahni-integration-";

export function createIntegrationCampaignSlug(): string {
  return `${MAHNI_INTEGRATION_CAMPAIGN_SLUG_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function deleteMahniCampaignBySlug(slug: string): Promise<void> {
  if (!slug.startsWith(MAHNI_INTEGRATION_CAMPAIGN_SLUG_PREFIX)) {
    throw new Error("refusing_to_delete_non_integration_campaign");
  }
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("md_event_campaigns").delete().eq("slug", slug);
  if (error) throw new Error(error.message);
}
