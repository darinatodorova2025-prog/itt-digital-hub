const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE = /(?:\+359|00359|0)(?:[\s\-()]?\d){6,12}\b/g;
const PERSON = /\b[A-ZА-Я][a-zа-я]{1,30} [A-ZА-Я][a-zа-я]{1,30}\b/g;
const LEGAL_ORG = /\b[\p{L}0-9][\p{L}0-9 .'"-]{1,80}?(?:ООД|ЕООД|АД|ЕАД)\b/gu;

function clip(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, Math.max(0, max - 1)).trim()}…`;
}

/** Display-only redaction. Stored participant text is left unchanged. */
export function publicExcerpt(value: string, options: { organization?: string; max?: number } = {}): string {
  let text = value.replace(/\0/g, "");
  text = text.replace(EMAIL, "[имейл]");
  text = text.replace(PHONE, "[телефон]");
  text = text.replace(PERSON, "[име]");
  text = text.replace(LEGAL_ORG, "[организация]");
  const organization = options.organization?.trim();
  if (organization && organization.length >= 4) {
    const escaped = organization.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escaped, "gi"), "[организация]");
  }
  const cleaned = clip(text, options.max ?? 180);
  return cleaned.length > 0 ? cleaned : "…";
}
