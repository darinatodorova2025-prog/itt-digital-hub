import type { StoryStage } from "@/mahni-dosadnoto/presentation";
import { STORY } from "@/mahni-dosadnoto/presentation";
import { StageGlyph } from "@/mahni-dosadnoto/icons";

export function ParticipantStage({ stage }: { stage: StoryStage }) {
  return (
    <div className="md-stage-chip" aria-label={`Стъпка ${stage.n} от 5: ${stage.label}`}>
      <span className="md-stage-icon">
        <StageGlyph stage={stage.n} size={18} />
      </span>
      <span>
        <span className="md-stage-index">
          {String(stage.n).padStart(2, "0")} / 05
        </span>
        <strong>{stage.rail}</strong>
      </span>
    </div>
  );
}

export function StageProgress({ stage }: { stage: StoryStage }) {
  return (
    <div className="md-progress" aria-hidden="true">
      {STORY.map((item) => (
        <span key={item.n} className={item.n < stage.n ? "is-done" : item.n === stage.n ? "is-current" : undefined} />
      ))}
    </div>
  );
}

export function LiveRail({ stage }: { stage: StoryStage }) {
  return (
    <ol className="md-rail" aria-label="Ход на събитието">
      {STORY.map((item) => {
        const state = item.n < stage.n ? "is-done" : item.n === stage.n ? "is-current" : undefined;
        return (
          <li key={item.n} className={state} aria-current={item.n === stage.n ? "step" : undefined}>
            <b>{item.n}</b>
            <em>{item.rail}</em>
          </li>
        );
      })}
    </ol>
  );
}

export function AdminRail({ stage }: { stage: StoryStage | null }) {
  return (
    <ol className="md-ops-rail" aria-label="Петте стъпки на събитието">
      {STORY.map((item) => {
        const state = !stage ? undefined : item.n < stage.n ? "is-done" : item.n === stage.n ? "is-current" : undefined;
        return (
          <li key={item.n} className={state}>
            <StageGlyph stage={item.n} size={16} />
            <span>
              <b>{item.n}</b> {item.rail}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
