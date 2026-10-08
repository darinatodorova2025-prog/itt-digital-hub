import { describe, expect, it } from "vitest";
import { creditsByTheme } from "@/mahni-dosadnoto/result-credits";

describe("result credits", () => {
  it("groups people under their organization for each theme", () => {
    const credits = creditsByTheme([
      { themeId: "t1", organization: "ВиК Пловдив", person: "Иван Петров" },
      { themeId: "t1", organization: "ВиК Пловдив", person: "Мария Георгиева" },
      { themeId: "t1", organization: "вик пловдив", person: "Иван Петров" },
      { themeId: "t1", organization: "Община", person: "Петър Иванов" },
      { themeId: "t2", organization: "ВиК Пловдив", person: "Анна Димитрова" },
      { themeId: "t1", organization: "  ", person: "Никой" },
    ]);

    expect(credits.get("t1")).toEqual([
      { organization: "ВиК Пловдив", people: ["Иван Петров", "Мария Георгиева"] },
      { organization: "Община", people: ["Петър Иванов"] },
    ]);
    expect(credits.get("t2")).toEqual([{ organization: "ВиК Пловдив", people: ["Анна Димитрова"] }]);
  });
});
