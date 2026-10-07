import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerMarkdown } from "../../src/components/vik-proektant/AnswerMarkdown";

describe("answer markdown rendering", () => {
  it("keeps control free of tables and source chrome", () => {
    const html = renderToStaticMarkup(
      <AnswerMarkdown text={"## Обхват\n\n**член**\n\n- условие\n\n| A | B |\n| --- | --- |\n| 1 | 2 |"} mode="control" />,
    );
    expect(html).not.toContain("<table");
    expect(html).not.toContain("<h3");
    expect(html).toContain("<strong");
    expect(html).toContain("<ul");
    expect(html).toContain("Обхват");
    expect(html).toContain("1 — 2");
  });

  it("gives expert a heading and a scrollable table", () => {
    const html = renderToStaticMarkup(
      <AnswerMarkdown text={"## Резултат\n\n| Параметър | Стойност |\n| --- | --- |\n| Диаметър | 90 |"} mode="expert" />,
    );
    expect(html).toContain("<h3");
    expect(html).toContain("<table");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("Диаметър");
  });

  it("typesets expert formulas and leaves control as plain text", () => {
    const source = "Формулата е \\(Q=v\\cdot\\pi D^2/4\\), откъдето:\n\\[ d=\\sqrt{\\frac{4(0{,}012)}{\\pi(1{,}0)}}\\approx 0{,}1236\\ \\mathrm{m} \\]";
    const expert = renderToStaticMarkup(<AnswerMarkdown text={source} mode="expert" />);
    const control = renderToStaticMarkup(<AnswerMarkdown text={source} mode="control" />);
    expect(expert).toContain("√");
    expect(expert).toContain("border-b");
    expect(expert).toContain("≈");
    expect(expert).not.toContain("\\frac");
    expect(expert).not.toContain("\\(");
    expect(expert).toContain("overflow-x-auto");
    expect(control).not.toContain("√");
    expect(control).toContain("Q=v");
    expect(control).toContain("\\frac");
    expect(control).not.toContain("<h3");
    expect(control).not.toContain("<table");
  });

  it("draws arrows and boxed results instead of printing the command names", () => {
    const source = "\\[ Q=vA \\Rightarrow D=\\sqrt{\\frac{4Q}{\\pi v}} \\approx \\boxed{123{,}6}\\ \\mathrm{mm} \\]";
    const html = renderToStaticMarkup(<AnswerMarkdown text={source} mode="expert" />);
    expect(html).toContain("⇒");
    expect(html).toContain(">1</span><span>2</span><span>3</span>");
    expect(html).toContain("border");
    expect(html).not.toContain("Rightarrow");
    expect(html).not.toContain("boxed");
  });

  it("does not turn a formula command into a script or link", () => {
    const html = renderToStaticMarkup(<AnswerMarkdown text={"\\(\\href{javascript:alert(1)}{x}\\)"} mode="expert" />);
    expect(html.toLowerCase()).not.toContain("<script");
    expect(html).not.toContain("<a ");
  });

  it("does not turn raw html into elements", () => {
    const html = renderToStaticMarkup(<AnswerMarkdown text={'<img src=x onerror="alert(1)">'} mode="expert" />);
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });
});
