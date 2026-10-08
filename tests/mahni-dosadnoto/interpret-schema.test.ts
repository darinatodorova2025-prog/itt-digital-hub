import { describe, expect, it } from "vitest";
import { interpretSchema } from "@/mahni-dosadnoto/ai/interpret";

const ideaId = "11111111-1111-4111-8111-111111111111";

describe("interpret schema", () => {
  it("accepts a raw array when domain tags are null", () => {
    const parsed = interpretSchema.parse([
      { ideaId, problem: "Ръчни протоколи", domainTags: null, role: "Инженер" },
      { ideaId: "22222222-2222-4222-8222-222222222222", pain: "Повторно въвеждане", domainTags: null },
    ]);

    expect(parsed.ideas[0]?.pain).toBe("Ръчни протоколи");
    expect(parsed.ideas[0]?.actorType).toBe("Инженер");
    expect(parsed.ideas[0]?.domainTags).toEqual([]);
    expect(parsed.ideas[1]?.domainTags).toEqual([]);
  });

  it("accepts tags inside an ideas object", () => {
    const parsed = interpretSchema.parse({
      ideas: [{ ideaId, pain: "Бавен отчет", domainTags: ["отчети", ""] }],
    });

    expect(parsed.ideas[0]?.domainTags).toEqual(["отчети"]);
  });
});
