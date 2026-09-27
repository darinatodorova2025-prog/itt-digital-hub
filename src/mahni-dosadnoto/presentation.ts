export function formatClock(totalSeconds: number | null): string {
  const seconds = Math.max(0, totalSeconds ?? 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function overlapHeadline(overlap: number | null): string {
  if (overlap === 3) return "Хората и ИИ са единодушни";
  const count = overlap ?? 0;
  return `${count} от 3 съвпадения`;
}

export function votesRemainingLabel(remaining: number): string {
  if (remaining === 1) return "Остава ви 1 глас";
  return `Остават ви ${remaining} гласа`;
}
