import type { JudgeType } from "@/mahni-dosadnoto/types";
import { LENS_COPY, lensVisual, type LensVisual } from "@/mahni-dosadnoto/presentation";
import { CheckIcon, LensGlyph } from "@/mahni-dosadnoto/icons";
import { JUDGE_TYPES } from "@/mahni-dosadnoto/types";

type Lens = { judge: JudgeType; status: string };

export function LensBoard({ lenses }: { lenses: Lens[] | null }) {
  const rows: Lens[] = lenses ?? JUDGE_TYPES.map((judge) => ({ judge, status: "missing" }));
  return (
    <ol className="md-lenses">
      {rows.map((lens, index) => {
        const visual: LensVisual = lensVisual(lens.status, index, rows);
        const copy = LENS_COPY[lens.judge];
        return (
          <li key={lens.judge} className={`is-${visual}`}>
            <span className="md-lens-mark">
              {visual === "done" ? <CheckIcon size={18} /> : <LensGlyph judge={lens.judge} size={18} />}
            </span>
            <span>
              <strong>{copy.title}</strong>
              <em>{copy.detail}</em>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
