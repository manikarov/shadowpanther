import { asset } from "../lib/asset";
import type { Talent, TalentArrow, TalentTreeData } from "../types";

// Grid metrics, shared by the talent cells and the dependency arrows drawn
// between them. One "pitch" is a full cell plus the gap that follows it.
const ICON = 44;
const GAP = 18;
const PITCH = ICON + GAP;
const COLS = 4;
const ROWS = 7;

function cellOffset(index: number): number {
  return index * PITCH;
}

function TalentIcon({ talent, points }: { talent: Talent; points: number }) {
  const maxed = points >= talent.maxPoints;
  const state = points === 0 ? "empty" : maxed ? "maxed" : "partial";

  return (
    // The hover tooltip comes from Wowhead's power.js, loaded in index.html,
    // which decorates every wowhead.com link on the site.
    <a
      className="talent"
      data-state={state}
      href={talent.spellUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`${talent.name} (${points}/${talent.maxPoints})`}
      style={{ left: cellOffset(talent.col), top: cellOffset(talent.row) }}
    >
      {talent.icon && <img src={asset(`assets/icons/talents/${talent.icon}.jpg`)} alt="" loading="lazy" />}
      <span className="talent-points">
        {points}/{talent.maxPoints}
      </span>
    </a>
  );
}

// Arrows are anchored on the prerequisite talent and run to the talent they
// unlock: straight down, or down-then-across for the one diagonal case.
function Arrow({ arrow }: { arrow: TalentArrow }) {
  const left = cellOffset(arrow.col) + ICON / 2;
  const top = cellOffset(arrow.row) + ICON;

  if (arrow.direction === "down") {
    const height = (arrow.size ?? 1) * PITCH - ICON;
    return <span className="talent-arrow" data-dir="down" style={{ left, top, height }} />;
  }

  // "right-down": drop one row, then run across to the neighbouring column.
  const height = (arrow.height ?? 1) * PITCH - ICON / 2;
  const width = (arrow.width ?? 1) * PITCH;
  return <span className="talent-arrow" data-dir="right-down" style={{ left, top, height, width }} />;
}

export function TalentTree({
  tree,
  points,
}: {
  tree: TalentTreeData;
  points: Record<string, number>;
}) {
  const spent = Object.values(points).reduce((total, n) => total + n, 0);

  return (
    <div className="talent-tree">
      <div className="talent-tree-header">
        <h3>{tree.name}</h3>
        <span className="talent-tree-points">{spent}</span>
      </div>
      <div
        className="talent-grid"
        style={{
          width: COLS * PITCH - GAP,
          height: ROWS * PITCH - GAP,
          backgroundImage: `url(${asset(`assets/icons/talent-backgrounds/${tree.key}.jpg`)})`,
        }}
      >
        {tree.arrows.map((arrow, i) => (
          <Arrow key={i} arrow={arrow} />
        ))}
        {tree.talents.map((talent) => (
          <TalentIcon key={talent.slug} talent={talent} points={points[talent.slug] ?? 0} />
        ))}
      </div>
    </div>
  );
}
