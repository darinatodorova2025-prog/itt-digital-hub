import type { ReactNode } from "react";
import type { Inline, MarkdownBlock } from "@/vik-proektant/comparison/presentation";
import { parseMarkdown } from "@/vik-proektant/comparison/presentation";

export function AnswerMarkdown({ text, mode }: { text: string; mode: "control" | "expert" }) {
  const blocks = parseMarkdown(text, mode);
  return (
    <div className={`max-w-[65ch] text-small leading-[1.7] break-words text-ink-2 ${mode === "expert" ? "space-y-4" : "space-y-3"}`}>
      {blocks.map((block, index) => (
        <MarkdownBlockView key={index} block={block} expert={mode === "expert"} />
      ))}
    </div>
  );
}

function MarkdownBlockView({ block, expert }: { block: MarkdownBlock; expert: boolean }) {
  if (block.type === "heading") {
    const Tag = block.level === 2 ? "h3" : "h4";
    return <Tag className="text-small font-medium text-pretty text-ink">{block.text}</Tag>;
  }
  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
        {block.items.map((item, index) => (
          <li key={index}>
            <InlineView nodes={item} />
          </li>
        ))}
      </Tag>
    );
  }
  if (block.type === "quote") {
    return (
      <blockquote className="border-l border-line pl-3 text-ink-2">
        <InlineView nodes={block.children} />
      </blockquote>
    );
  }
  if (block.type === "table") {
    return (
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[18rem] border-collapse text-left text-small">
          <thead>
            <tr className="border-b border-line">
              {block.headers.map((header, index) => (
                <th key={`${header}-${index}`} className="px-2 py-2 font-medium text-ink">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, index) => (
              <tr key={index} className="border-b border-line">
                {block.headers.map((_, cell) => (
                  <td key={cell} className="px-2 py-2 align-top text-ink-2">
                    {row[cell] ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "math") {
    return (
      <div className="my-3 overflow-x-auto rounded-xl bg-white px-3 py-3 text-ink">
        <Formula tex={block.tex} display />
      </div>
    );
  }
  if (block.type === "code" && expert) {
    return (
      <pre className="overflow-x-auto rounded-2xl bg-paper px-3 py-2 text-meta text-ink">
        <code>{block.text}</code>
      </pre>
    );
  }
  return (
    <p>
      <InlineView nodes={block.type === "code" ? [{ type: "text", text: block.text }] : block.children} />
    </p>
  );
}

function InlineView({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, index) => (
        <InlineNode key={index} node={node} />
      ))}
    </>
  );
}

function InlineNode({ node }: { node: Inline }): ReactNode {
  if (node.type === "strong") return <strong className="font-medium text-ink"><InlineView nodes={node.children} /></strong>;
  if (node.type === "em") return <em><InlineView nodes={node.children} /></em>;
  if (node.type === "math") return <Formula tex={node.tex} display={node.display} />;
  if (node.type === "code") return <code className="rounded bg-paper px-1 py-0.5 text-meta text-ink">{node.text}</code>;
  if (node.type === "link") {
    return (
      <a href={node.href} target="_blank" rel="noopener noreferrer" className="text-ink underline decoration-line-strong underline-offset-2">
        {node.text}
      </a>
    );
  }
  return node.text;
}

function Formula({ tex, display }: { tex: string; display: boolean }) {
  return (
    <span className={display ? "block text-center text-[1.12em] text-ink" : "mx-0.5 inline-block max-w-full align-[-0.15em] text-ink"}>
      <span className="inline-block font-serif text-[1.05em] leading-tight">{renderFormula(tex)}</span>
    </span>
  );
}

function renderFormula(tex: string): ReactNode {
  const tokens = tokenizeFormula(tex);
  const cursor = { index: 0 };
  return <>{parseFormula(tokens, cursor, false)}</>;
}

type FormulaToken =
  | { kind: "command"; name: string }
  | { kind: "char"; value: string }
  | { kind: "open" }
  | { kind: "close" }
  | { kind: "sup" }
  | { kind: "sub" };

function tokenizeFormula(tex: string): FormulaToken[] {
  const tokens: FormulaToken[] = [];
  let index = 0;
  while (index < tex.length) {
    const char = tex[index] ?? "";
    if (char === "\\") {
      const next = tex[index + 1] ?? "";
      if (/[a-zA-Z]/.test(next)) {
        let end = index + 1;
        while (end < tex.length && /[a-zA-Z]/.test(tex[end] ?? "")) end += 1;
        tokens.push({ kind: "command", name: tex.slice(index + 1, end) });
        index = end;
        continue;
      }
      if (next === "," || next === ";" || next === ":" || next === " ") {
        tokens.push({ kind: "char", value: "\u2009" });
        index += 2;
        continue;
      }
      if (next) tokens.push({ kind: "char", value: next });
      index += next ? 2 : 1;
      continue;
    }
    if (char === "{") tokens.push({ kind: "open" });
    else if (char === "}") tokens.push({ kind: "close" });
    else if (char === "^") tokens.push({ kind: "sup" });
    else if (char === "_") tokens.push({ kind: "sub" });
    else if (char !== " " && char !== "\n") tokens.push({ kind: "char", value: char });
    index += 1;
  }
  return tokens;
}

function parseFormula(tokens: FormulaToken[], cursor: { index: number }, untilClose: boolean): ReactNode[] {
  const parts: ReactNode[] = [];
  while (cursor.index < tokens.length) {
    const token = tokens[cursor.index];
    if (!token) break;
    if (untilClose && token.kind === "close") {
      cursor.index += 1;
      break;
    }
    if (token.kind === "sup" || token.kind === "sub") {
      cursor.index += 1;
      const script = parseAtom(tokens, cursor);
      const base = parts.pop();
      const Tag = token.kind === "sup" ? "sup" : "sub";
      parts.push(
        <span key={parts.length} className="inline-flex items-baseline">
          {base}
          <Tag className="text-[0.72em] leading-none">{script}</Tag>
        </span>,
      );
      continue;
    }
    parts.push(<span key={parts.length}>{parseAtom(tokens, cursor)}</span>);
  }
  return parts;
}

function parseAtom(tokens: FormulaToken[], cursor: { index: number }): ReactNode {
  const token = tokens[cursor.index];
  if (!token) return null;
  cursor.index += 1;
  if (token.kind === "open") return <>{parseFormula(tokens, cursor, true)}</>;
  if (token.kind === "char") return token.value;
  if (token.kind === "command") {
    if (token.name === "frac" || token.name === "dfrac" || token.name === "tfrac") return <Fraction num={parseAtom(tokens, cursor)} den={parseAtom(tokens, cursor)} />;
    if (token.name === "sqrt") return <SquareRoot>{parseAtom(tokens, cursor)}</SquareRoot>;
    if (token.name === "text" || token.name === "mathrm" || token.name === "textrm") {
      return <span className="font-sans text-[0.92em]">{parseAtom(tokens, cursor)}</span>;
    }
    if (token.name === "boxed" || token.name === "fbox") {
      return <span className="mx-0.5 border border-current px-1">{parseAtom(tokens, cursor)}</span>;
    }
    if (token.name === "left" || token.name === "right") return null;
    return formulaSymbol(token.name);
  }
  return null;
}

function Fraction({ num, den }: { num: ReactNode; den: ReactNode }) {
  return (
    <span className="mx-0.5 inline-flex flex-col items-center align-middle leading-none">
      <span className="border-b border-current px-1 pb-0.5">{num}</span>
      <span className="px-1 pt-0.5">{den}</span>
    </span>
  );
}

function SquareRoot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-stretch align-middle">
      <span aria-hidden="true">√</span>
      <span className="border-t border-current px-0.5">{children}</span>
    </span>
  );
}

function formulaSymbol(name: string): string {
  const symbols: Record<string, string> = {
    cdot: "·",
    times: "×",
    pi: "π",
    alpha: "α",
    beta: "β",
    gamma: "γ",
    Delta: "Δ",
    theta: "θ",
    lambda: "λ",
    mu: "μ",
    rho: "ρ",
    sigma: "σ",
    phi: "φ",
    omega: "ω",
    leq: "≤",
    geq: "≥",
    neq: "≠",
    approx: "≈",
    pm: "±",
    infty: "∞",
    quad: " ",
    Rightarrow: "⇒",
    rightarrow: "→",
    Longrightarrow: "→",
    implies: "⇒",
    Leftarrow: "⇐",
    leftarrow: "←",
    to: "→",
  };
  return symbols[name] ?? "";
}
