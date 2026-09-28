const ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Escape untrusted text for safe HTML insertion (React still escapes; use for CSV/export too). */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ESCAPE[ch] ?? ch);
}

export function sanitizePlainText(value: string, max = 4000): string {
  return value.replace(/\0/g, "").trim().slice(0, max);
}
