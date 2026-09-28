export type ToolKind = "retrieval" | "reference" | "calculation";

export type CalculationKey =
  | "flow"
  | "velocity_m_s"
  | "diameter_mm"
  | "length_m"
  | "hazen_williams_c"
  | "slope_m_per_m"
  | "manning_n"
  | "area_m2"
  | "head_loss_m"
  | "hydraulic_gradient_m_per_m"
  | "discharge_m3_s"
  | "discharge_l_s";

export type PublicSource = {
  title: string;
  number: string;
  year: number | null;
  dvReference: string;
  locators: string[];
  url: string;
};

export type PublicCalculation = {
  inputs: Array<{ key: CalculationKey; value: string }>;
  results: Array<{ key: CalculationKey; value: string; unit: string }>;
  rejected: boolean;
  message: string;
};

const INPUT_KEYS = ["velocity_m_s", "diameter_mm", "length_m", "hazen_williams_c", "slope_m_per_m", "manning_n"] as const;
const RESULT_KEYS = ["diameter_mm", "velocity_m_s", "head_loss_m", "discharge_l_s", "discharge_m3_s", "area_m2", "hydraulic_gradient_m_per_m"] as const;

const RESULT_UNITS: Partial<Record<CalculationKey, string>> = {
  diameter_mm: "mm",
  area_m2: "m2",
  velocity_m_s: "m/s",
  head_loss_m: "m",
  hydraulic_gradient_m_per_m: "m/m",
  discharge_m3_s: "m3/s",
  discharge_l_s: "L/s",
};

export function collectExecution(calls: Array<{ name: string; output: string }>): {
  sources: PublicSource[];
  calculations: PublicCalculation[];
  toolKinds: ToolKind[];
  sourceIds: Set<string>;
  retrievalCount: number;
  calculationPerformed: boolean;
  calculationInputRejected: boolean;
} {
  const drafts: SourceDraft[] = [];
  const calculations: PublicCalculation[] = [];
  const toolKinds: ToolKind[] = [];
  const sourceIds = new Set<string>();
  let retrievalCount = 0;
  let calculationPerformed = false;
  let calculationInputRejected = false;

  for (const call of calls) {
    const kind = toolKind(call.name);
    if (kind && !toolKinds.includes(kind)) toolKinds.push(kind);
    const payload = unwrap(call.output);
    if (kind === "retrieval") retrievalCount += 1;
    if (kind === "reference") {
      for (const draft of sourceDrafts(payload)) {
        if (draft.documentId) sourceIds.add(draft.documentId);
        if (draft.title) drafts.push(draft);
      }
    }
    if (kind === "calculation") {
      const calculation = calculationFrom(payload);
      if (!calculation) continue;
      calculations.push(calculation);
      if (calculation.rejected) calculationInputRejected = true;
      else if (calculation.results.length > 0) calculationPerformed = true;
    }
  }

  return {
    sources: groupSources(drafts),
    calculations,
    toolKinds,
    sourceIds,
    retrievalCount,
    calculationPerformed,
    calculationInputRejected,
  };
}

type SourceDraft = {
  documentId: string;
  title: string;
  number: string;
  year: number | null;
  dvReference: string;
  locator: string;
  url: string;
};

function toolKind(name: string): ToolKind | null {
  if (name === "search_vik_knowledge") return "retrieval";
  if (name === "get_vik_reference") return "reference";
  if (name.startsWith("calculate_")) return "calculation";
  return null;
}

function sourceDrafts(payload: unknown): SourceDraft[] {
  return sourceRecords(payload).flatMap((record) => {
    const nested = isRecord(record.source) ? record.source : null;
    const title = text(record.title) || text(nested?.title);
    const documentId = text(record.documentId) || text(nested?.documentId);
    const number = text(record.number) || text(nested?.number);
    const year = yearOf(record.year) ?? yearOf(nested?.year);
    const dvReference = text(record.dvReference) || text(nested?.dvReference);
    const url = httpsUrl(record.url) || httpsUrl(record.sourceUrl) || httpsUrl(record.href) || httpsUrl(nested?.url);
    const locator = locatorOf(record);
    if (!title && !documentId) return [];
    return [{ documentId, title, number, year, dvReference, locator, url }];
  });
}

function sourceRecords(payload: unknown): Record<string, unknown>[] {
  if (!isRecord(payload)) return [];
  if (Array.isArray(payload.results)) return payload.results.filter(isRecord);
  if (isRecord(payload.reference)) return [payload.reference];
  if (text(payload.title) || isRecord(payload.source)) return [payload];
  return [];
}

function locatorOf(record: Record<string, unknown>): string {
  const article = text(record.article);
  const section = text(record.section);
  const heading = text(record.heading);
  const parts: string[] = [];
  if (article) parts.push(/^\d/.test(article) ? `чл. ${article}` : article);
  if (section) parts.push(section);
  if (heading && heading !== section && heading !== article) parts.push(heading);
  return parts.join(" · ");
}

function groupSources(drafts: SourceDraft[]): PublicSource[] {
  const groups = new Map<string, PublicSource>();
  for (const draft of drafts) {
    if (!draft.title) continue;
    const key = [draft.title, draft.number, draft.year ?? "", draft.dvReference].join("|");
    const current = groups.get(key) ?? {
      title: draft.title,
      number: draft.number,
      year: draft.year,
      dvReference: draft.dvReference,
      locators: [],
      url: draft.url,
    };
    if (draft.locator && !current.locators.includes(draft.locator)) current.locators.push(draft.locator);
    if (!current.url && draft.url) current.url = draft.url;
    groups.set(key, current);
  }
  return [...groups.values()];
}

function calculationFrom(payload: unknown): PublicCalculation | null {
  const record = calculationRecord(payload);
  if (!record) return null;
  const error = isRecord(record.error) ? record.error : null;
  const rejected = text(record.code) === "invalid_input" || text(error?.code) === "invalid_input";
  if (rejected) {
    return { inputs: [], results: [], rejected: true, message: text(record.message) || text(error?.message) };
  }
  const inputs = isRecord(record.inputs) ? record.inputs : {};
  const result = isRecord(record.result) ? record.result : null;
  const units = isRecord(record.units) ? record.units : {};
  if (!result) return null;
  return {
    inputs: inputRows(inputs),
    results: resultRows(result, units),
    rejected: false,
    message: "",
  };
}

function calculationRecord(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.operation === "string" || isRecord(payload.result) || isRecord(payload.error) || payload.code === "invalid_input") {
    return payload;
  }
  if (isRecord(payload.calculation)) return payload.calculation;
  return null;
}

function inputRows(inputs: Record<string, unknown>): PublicCalculation["inputs"] {
  const rows: PublicCalculation["inputs"] = [];
  if (typeof inputs.flow === "number" && typeof inputs.flow_unit === "string") {
    rows.push({ key: "flow", value: `${formatNumber(inputs.flow)} ${inputs.flow_unit}` });
  }
  for (const key of INPUT_KEYS) {
    const value = inputs[key];
    if (typeof value !== "number") continue;
    rows.push({ key, value: formatNumber(value) });
  }
  return rows;
}

function resultRows(result: Record<string, unknown>, units: Record<string, unknown>): PublicCalculation["results"] {
  const rows: PublicCalculation["results"] = [];
  for (const key of RESULT_KEYS) {
    const value = result[key];
    if (typeof value !== "number") continue;
    const unit = typeof units[key] === "string" ? units[key] : RESULT_UNITS[key] ?? "";
    rows.push({ key, value: formatNumber(value), unit });
  }
  return rows;
}

function unwrap(output: string): unknown {
  const parsed = parseJson(output);
  if (!isRecord(parsed)) return parsed;
  const content = Array.isArray(parsed.content) ? parsed.content : [];
  const textPart = content.find((item) => isRecord(item) && typeof item.text === "string");
  if (isRecord(textPart) && typeof textPart.text === "string") return parseJson(textPart.text);
  return parsed;
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function httpsUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function yearOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatNumber(value: number): string {
  return String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "math"; tex: string; display: boolean };

export type MarkdownBlock =
  | { type: "paragraph"; children: Inline[] }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; children: Inline[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string }
  | { type: "math"; tex: string };

export function parseMarkdown(source: string, mode: "control" | "expert"): MarkdownBlock[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index]?.trim()) {
      index += 1;
      continue;
    }
    if (mode === "expert" && lines[index]?.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      if (lines[index]?.startsWith("```")) index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    const math = mode === "expert";
    const table = readTable(lines, index);
    if (table) {
      if (mode === "expert") blocks.push(table.block);
      else {
        blocks.push({ type: "paragraph", children: inline(table.block.headers.join(" — ")) });
        for (const row of table.block.rows) blocks.push({ type: "paragraph", children: inline(row.join(" — ")) });
      }
      index = table.next;
      continue;
    }
    const list = readList(lines, index, math);
    if (list) {
      blocks.push(list.block);
      index = list.next;
      continue;
    }
    const quote = readQuote(lines, index);
    if (quote) {
      const children = inline(quote.text, math);
      blocks.push(mode === "expert" ? { type: "quote", children } : { type: "paragraph", children });
      index = quote.next;
      continue;
    }
    const heading = headingMatch(lines[index] ?? "");
    if (heading) {
      blocks.push(mode === "expert" ? { type: "heading", level: heading.level, text: heading.text } : { type: "paragraph", children: inline(heading.text) });
      index += 1;
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index]?.trim() && !isBoundary(lines, index)) {
      paragraph.push(lines[index] ?? "");
      index += 1;
    }
    appendInline(blocks, inline(paragraph.join(" "), math));
  }
  return blocks;
}

function headingMatch(line: string): { level: 2 | 3; text: string } | null {
  const match = /^(#{1,3})\s+(.+)$/.exec(line);
  if (!match?.[2]) return null;
  return { level: match[1] === "###" ? 3 : 2, text: match[2].trim() };
}

function isBoundary(lines: string[], index: number): boolean {
  const line = lines[index] ?? "";
  if (line.startsWith("```") || line.startsWith(">") || /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line) || /^#{1,3}\s+/.test(line)) return true;
  return looksLikeTable(lines, index);
}

function readList(lines: string[], start: number, math: boolean): { block: MarkdownBlock; next: number } | null {
  const ordered = /^\d+\.\s+/.test(lines[start] ?? "");
  const unordered = /^[-*]\s+/.test(lines[start] ?? "");
  if (!ordered && !unordered) return null;
  const items: Inline[][] = [];
  let index = start;
  const pattern = ordered ? /^\d+\.\s+(.*)$/ : /^[-*]\s+(.*)$/;
  while (index < lines.length) {
    const match = pattern.exec(lines[index] ?? "");
    if (!match) break;
    items.push(inline(match[1] ?? "", math));
    index += 1;
  }
  return { block: { type: "list", ordered, items }, next: index };
}

function readQuote(lines: string[], start: number): { text: string; next: number } | null {
  if (!(lines[start] ?? "").startsWith(">")) return null;
  const parts: string[] = [];
  let index = start;
  while (index < lines.length && (lines[index] ?? "").startsWith(">")) {
    parts.push((lines[index] ?? "").replace(/^>\s?/, ""));
    index += 1;
  }
  return { text: parts.join(" "), next: index };
}

function readTable(lines: string[], start: number): { block: Extract<MarkdownBlock, { type: "table" }>; next: number } | null {
  if (!looksLikeTable(lines, start)) return null;
  const headers = splitRow(lines[start] ?? "");
  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length && (lines[index] ?? "").includes("|") && !/^[\s|:-]+$/.test(lines[index] ?? "")) {
    rows.push(splitRow(lines[index] ?? ""));
    index += 1;
  }
  if (headers.length < 2 || rows.length === 0) return null;
  return { block: { type: "table", headers, rows }, next: index };
}

function looksLikeTable(lines: string[], index: number): boolean {
  const header = lines[index] ?? "";
  const separator = lines[index + 1] ?? "";
  return header.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(separator);
}

function splitRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function appendInline(blocks: MarkdownBlock[], children: Inline[]): void {
  let buffer: Inline[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    blocks.push({ type: "paragraph", children: buffer });
    buffer = [];
  };
  for (const node of children) {
    if (node.type === "math" && node.display) {
      flush();
      blocks.push({ type: "math", tex: node.tex });
    } else buffer.push(node);
  }
  flush();
}

function inline(source: string, math = false): Inline[] {
  if (!math) return inlinePlain(source);
  const nodes: Inline[] = [];
  let buffer = "";
  let index = 0;
  const flush = () => {
    if (!buffer) return;
    nodes.push(...inlinePlain(buffer));
    buffer = "";
  };
  while (index < source.length) {
    const display = readDelimited(source, index, "\\[", "\\]") ?? readDelimited(source, index, "$$", "$$");
    if (display) {
      flush();
      nodes.push({ type: "math", tex: display.tex, display: true });
      index = display.next;
      continue;
    }
    const inlineMath = readDelimited(source, index, "\\(", "\\)");
    if (inlineMath) {
      flush();
      nodes.push({ type: "math", tex: inlineMath.tex, display: false });
      index = inlineMath.next;
      continue;
    }
    buffer += source[index];
    index += 1;
  }
  flush();
  return nodes.length > 0 ? nodes : [{ type: "text", text: source }];
}

function readDelimited(source: string, index: number, open: string, close: string): { tex: string; next: number } | null {
  if (!source.startsWith(open, index)) return null;
  const start = index + open.length;
  const end = source.indexOf(close, start);
  if (end === -1) return null;
  return { tex: source.slice(start, end).trim(), next: end + close.length };
}

function inlinePlain(source: string): Inline[] {
  const nodes: Inline[] = [];
  const pattern = /(`[^`]+`)|(\*\*([^*]+)\*\*)|(\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))|(\*([^*\n]+)\*)/g;
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > cursor) nodes.push({ type: "text", text: source.slice(cursor, start) });
    if (match[1]) nodes.push({ type: "code", text: match[1].slice(1, -1) });
    else if (match[3]) nodes.push({ type: "strong", children: [{ type: "text", text: match[3] }] });
    else if (match[5] && match[6] && safeHref(match[6])) nodes.push({ type: "link", text: match[5], href: safeHref(match[6]) });
    else if (match[5] && match[6]) nodes.push({ type: "text", text: match[5] });
    else if (match[8]) nodes.push({ type: "em", children: [{ type: "text", text: match[8] }] });
    cursor = start + match[0].length;
  }
  if (cursor < source.length) nodes.push({ type: "text", text: source.slice(cursor) });
  return nodes.length > 0 ? nodes : [{ type: "text", text: source }];
}

function safeHref(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}
