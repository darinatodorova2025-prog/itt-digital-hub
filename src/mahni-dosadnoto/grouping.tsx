import { countLabel } from "@/mahni-dosadnoto/presentation";

export function ThemeEquation({
  ideas,
  themes,
  extra,
  ready,
}: {
  ideas: number;
  themes: number;
  extra: number;
  ready: boolean;
}) {
  return (
    <div className="md-equation" aria-label={ready ? "Идеите са подредени в теми" : "Идеите се подреждат"}>
      <div>
        <strong className="md-tick" key={ideas}>
          {ideas}
        </strong>
        <span>{countLabel(ideas, "идея", "идеи")}</span>
      </div>
      <span className="md-eq-arrow" aria-hidden="true">
        <svg width="28" height="16" viewBox="0 0 28 16" fill="none">
          <path d="M1 8h24M19 2.5 25.5 8 19 13.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <div className={ready ? undefined : "is-waiting"}>
        <strong className="md-tick" key={ready ? themes : "wait"}>
          {ready ? themes : "—"}
        </strong>
        <span>{ready ? countLabel(themes, "обща тема", "общи теми") : "общи теми"}</span>
      </div>
      {ready && extra > 0 ? (
        <div className="md-eq-extra">
          <span className="md-eq-plus" aria-hidden="true">
            +
          </span>
          <div>
            <strong className="md-tick" key={extra}>
              {extra}
            </strong>
            <span>{countLabel(extra, "допълнителна идея от ИИ", "допълнителни идеи от ИИ")}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Light grouping diagram for the participant phone. The photographic asset is used on the live screen. */
export function GroupingDiagram() {
  return (
    <svg className="md-cluster" viewBox="0 0 360 168" role="img" aria-label="Много идеи се събират в общи теми">
      <g className="md-cluster-loose">
        <rect x="8" y="18" width="46" height="32" rx="6" />
        <rect x="28" y="58" width="42" height="28" rx="6" />
        <rect x="12" y="100" width="50" height="30" rx="6" />
        <rect x="62" y="28" width="38" height="26" rx="6" />
        <rect x="70" y="78" width="44" height="30" rx="6" />
        <rect x="54" y="118" width="36" height="24" rx="6" />
      </g>
      <path className="md-cluster-flow" d="M112 48c28 8 36 10 58 8M118 92c24 2 40 0 62-8M108 128c30-6 42-16 70-28" />
      <g className="md-cluster-groups">
        <ellipse cx="248" cy="40" rx="52" ry="28" />
        <rect x="222" y="24" width="34" height="22" rx="5" />
        <rect x="248" y="30" width="30" height="20" rx="5" />
        <ellipse cx="270" cy="96" rx="56" ry="30" />
        <rect x="242" y="78" width="36" height="22" rx="5" />
        <rect x="268" y="90" width="32" height="20" rx="5" />
        <rect x="250" y="100" width="28" height="18" rx="5" />
        <ellipse cx="236" cy="146" rx="46" ry="18" />
        <rect x="214" y="136" width="30" height="16" rx="4" />
        <rect x="238" y="140" width="26" height="14" rx="4" />
      </g>
    </svg>
  );
}
