export function flowBucket(flowM3h: number): string {
  if (flowM3h < 0.1) return "<0.1";
  if (flowM3h < 1) return "0.1-1";
  if (flowM3h < 5) return "1-5";
  if (flowM3h < 20) return "5-20";
  return ">=20";
}

export function insulationBucket(thicknessMm: number): string {
  if (thicknessMm <= 0) return "0";
  if (thicknessMm < 20) return "1-19";
  if (thicknessMm < 50) return "20-49";
  if (thicknessMm < 90) return "50-89";
  return ">=90";
}

export function deltaTBucket(initialC: number, ambientC: number): string {
  const delta = initialC - ambientC;
  if (delta < 5) return "<5";
  if (delta < 20) return "5-20";
  if (delta < 40) return "20-40";
  return ">=40";
}

export function changedLayers(
  previous: object,
  next: object,
): Array<{ layer: string; enabled: boolean }> {
  const before = previous as Record<string, boolean>;
  const after = next as Record<string, boolean>;
  const changes: Array<{ layer: string; enabled: boolean }> = [];
  for (const layer of Object.keys(after)) {
    if (Boolean(before[layer]) !== Boolean(after[layer])) {
      changes.push({ layer, enabled: Boolean(after[layer]) });
    }
  }
  return changes;
}
