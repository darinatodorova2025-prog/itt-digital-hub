import type { EventPhase, JudgeType } from "@/mahni-dosadnoto/types";

export type StoryStage = {
  n: 1 | 2 | 3 | 4 | 5;
  label: string;
  rail: string;
};

export const STORY = [
  { n: 1, label: "Споделяме", rail: "Споделяме" },
  { n: 2, label: "Подреждаме", rail: "Подреждаме" },
  { n: 3, label: "Избираме", rail: "Избираме" },
  { n: 4, label: "Втори поглед", rail: "Втори поглед" },
  { n: 5, label: "От резултат към действие", rail: "Резултат" },
] as const satisfies readonly StoryStage[];

export const LENS_COPY: Record<JudgeType, { title: string; detail: string }> = {
  business_value: {
    title: "Бизнес стойност",
    detail: "Оценява потенциалния ефект",
  },
  feasibility: {
    title: "Реализируемост",
    detail: "Оценява практическата приложимост",
  },
  innovation: {
    title: "Нови възможности",
    detail: "Търси допълнителна перспектива",
  },
};

export function formatClock(totalSeconds: number | null): string {
  const seconds = Math.max(0, totalSeconds ?? 0);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function votesRemainingLabel(remaining: number): string {
  if (remaining === 1) return "Остава ви 1 глас";
  return `Остават ви ${remaining} гласа`;
}

const [share, arrange, choose, secondView, result] = STORY;

export function storyForPhase(phase: EventPhase): StoryStage | null {
  switch (phase) {
    case "COLLECTING":
      return share;
    case "ANALYZING":
      return arrange;
    case "VOTING":
    case "FINALIZING":
      return choose;
    case "AI_JURY":
      return secondView;
    case "RESULTS":
    case "CLOSED":
      return result;
    default:
      return null;
  }
}

export function operatorPhaseTitle(phase: EventPhase): string {
  switch (phase) {
    case "DRAFT":
      return "Подготовка";
    case "COLLECTING":
      return "Споделяме";
    case "ANALYZING":
      return "Подреждаме";
    case "VOTING":
      return "Избираме";
    case "FINALIZING":
      return "Последни секунди";
    case "AI_JURY":
      return "Втори поглед";
    case "RESULTS":
      return "Резултати";
    case "CLOSED":
      return "Приключено";
  }
}

export function operatorPhaseNote(phase: EventPhase): string {
  switch (phase) {
    case "DRAFT":
      return "Събитието още не е стартирало.";
    case "COLLECTING":
      return "Реалните проблеми влизат в системата.";
    case "ANALYZING":
      return "Отделните идеи се събират в общи теми.";
    case "VOTING":
      return "Участниците определят кои теми заслужават внимание.";
    case "FINALIZING":
      return "Гласуването приключва. Изборът на участниците се запазва.";
    case "AI_JURY":
      return "ИИ разглежда същите теми независимо.";
    case "RESULTS":
      return "Резултатът е показан. Официалният избор е на участниците.";
    case "CLOSED":
      return "Събитието е приключено. Резултатът остава видим.";
  }
}

export function sharedPriorityHeadline(count: number): string | null {
  if (count === 1) return "Един общ приоритет";
  if (count === 2) return "Два общи приоритета";
  if (count === 3) return "Три общи приоритета";
  return null;
}

export function sharedPriorityBody(count: number): string | null {
  if (count === 1) return "Тази тема се открои и в избора на участниците, и в независимия анализ.";
  if (count > 1) return "Тези теми се откроиха и в избора на участниците, и в независимия анализ.";
  return null;
}

export function countLabel(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}

export type LensVisual = "done" | "active" | "wait";

export function lensVisual(
  status: string,
  index: number,
  lenses: Array<{ status: string }>,
): LensVisual {
  if (status === "succeeded") return "done";
  if (status === "running" || status === "failed") return "active";
  const anyActive = lenses.some((lens) => lens.status === "running" || lens.status === "failed");
  const firstOpen = lenses.findIndex((lens) => lens.status !== "succeeded");
  if (!anyActive && index === firstOpen) return "active";
  return "wait";
}
