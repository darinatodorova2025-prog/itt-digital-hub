import { describe, expect, it } from "vitest";
import { SupabaseMahniStore } from "@/mahni-dosadnoto/store/supabase/store";
import {
  createIntegrationCampaignSlug,
  deleteMahniCampaignBySlug,
} from "./supabase-integration-helpers";

const integrationEnabled = process.env.MAHNI_INTEGRATION_SUPABASE === "true";

describe.skipIf(!integrationEnabled)("mahni supabase integration", () => {
  it("persists participant session across separate store instances", async () => {
    const slug = createIntegrationCampaignSlug();
    const token = `integration-${Date.now()}`;
    const storeA = new SupabaseMahniStore(slug);
    try {
      await storeA.ensureCampaign();
      await storeA.transitionPhase("COLLECTING");
      await storeA.registerParticipant(
        {
          firstName: "Integration",
          lastName: "Test",
          organization: "Test Org",
          role: "Tester",
          email: `integration-${Date.now()}@example.test`,
          marketingConsent: false,
        },
        token,
      );

      const storeB = new SupabaseMahniStore(slug);
      const participant = await storeB.resolveParticipant(token);
      expect(participant?.firstName).toBe("Integration");
    } finally {
      await deleteMahniCampaignBySlug(slug);
    }
  });
});

describe("mahni supabase integration availability", () => {
  it("documents optional live Supabase test gate", () => {
    expect(integrationEnabled).toBe(process.env.MAHNI_INTEGRATION_SUPABASE === "true");
  });
});
