const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export type CampaignProperties = Partial<Record<(typeof UTM_KEYS)[number], string>>;

/** Read campaign parameters from the landing query, then from the first-party cookie. */
export function readCampaign(search: string, cookieHeader: string | null | undefined): CampaignProperties {
  const fromUrl = fromSearch(search);
  if (Object.keys(fromUrl).length > 0) return fromUrl;
  return fromCookie(cookieHeader);
}

export function campaignCookieValue(properties: CampaignProperties): string | null {
  const clean = fromRecord(properties);
  if (Object.keys(clean).length === 0) return null;
  return encodeURIComponent(JSON.stringify(clean));
}

function fromSearch(search: string): CampaignProperties {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: CampaignProperties = {};
  for (const key of UTM_KEYS) {
    const value = clip(params.get(key));
    if (value) out[key] = value;
  }
  return out;
}

function fromCookie(cookieHeader: string | null | undefined): CampaignProperties {
  if (!cookieHeader) return {};
  const row = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith("itt_utm="));
  if (!row) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(row.slice("itt_utm=".length))) as unknown;
    return fromRecord(parsed);
  } catch {
    return {};
  }
}

function fromRecord(value: unknown): CampaignProperties {
  if (!value || typeof value !== "object") return {};
  const record = value as Record<string, unknown>;
  const out: CampaignProperties = {};
  for (const key of UTM_KEYS) {
    const clean = clip(typeof record[key] === "string" ? record[key] : null);
    if (clean) out[key] = clean;
  }
  return out;
}

function clip(value: string | null | undefined): string | null {
  const clean = value?.trim();
  if (!clean) return null;
  return clean.slice(0, 80);
}
