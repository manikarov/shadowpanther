import { useEffect, useState } from "react";
import { TalentTree } from "../components/TalentTree";
import type { TalentPageConfig } from "../config/talents";
import { asset } from "../lib/asset";
import type { Talent, TalentBuild, TalentData, TalentOrderStep } from "../types";

/** Accumulate a levelling order into the finished point spread. */
function pointsFromOrder(order: TalentOrderStep[]): TalentBuild["points"] {
  const points: TalentBuild["points"] = {};
  for (const step of order) {
    const tree = (points[step.tree] ??= {});
    tree[step.slug] = (tree[step.slug] ?? 0) + step.points;
  }
  return points;
}

/** Rogues get their first talent point at level 10. */
const FIRST_TALENT_LEVEL = 10;

/** Expand the order into one row per point, the way the in-game order reads. */
function orderRows(order: TalentOrderStep[], data: TalentData) {
  const talents = new Map<string, Talent>();
  for (const tree of data.trees) {
    for (const talent of tree.talents) talents.set(`${tree.key}/${talent.slug}`, talent);
  }

  const rank: Record<string, number> = {};
  const rows: { level: number; talent: Talent | undefined; slug: string; rank: number }[] = [];

  for (const step of order) {
    const key = `${step.tree}/${step.slug}`;
    for (let i = 0; i < step.points; i++) {
      rank[key] = (rank[key] ?? 0) + 1;
      rows.push({
        level: FIRST_TALENT_LEVEL + rows.length,
        talent: talents.get(key),
        slug: step.slug,
        rank: rank[key],
      });
    }
  }
  return rows;
}

function Build({ build, data }: { build: TalentBuild; data: TalentData }) {
  const points = build.order ? pointsFromOrder(build.order) : build.points;
  const spent = data.trees.map((tree) =>
    Object.values(points[tree.key] ?? {}).reduce((total, n) => total + n, 0),
  );

  return (
    <section className="chart-section talent-build">
      <div className="talent-build-head">
        <h2>{build.name}</h2>
        <span className="talent-build-spread">{spent.join(" / ")}</span>
      </div>
      <p className="section-note">{build.note}</p>
      <div className="talent-trees">
        {data.trees.map((tree) => (
          <TalentTree key={tree.key} tree={tree} points={points[tree.key] ?? {}} />
        ))}
      </div>

      {build.order && (
        <div className="talent-order">
          <h3>Talent Order</h3>
          <ol className="talent-order-list">
            {orderRows(build.order, data).map((row) => (
              <li key={row.level}>
                <span className="talent-order-level">{row.level}</span>
                {row.talent?.icon && (
                  <img
                    className="talent-order-icon"
                    src={asset(`assets/icons/talents/${row.talent.icon}.jpg`)}
                    alt=""
                    loading="lazy"
                  />
                )}
                <a
                  className="talent-order-name"
                  href={row.talent?.spellUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.talent?.name ?? row.slug}
                </a>
                <span className="talent-order-rank">Rank {row.rank}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {build.wowheadUrl && (
        <p className="talent-build-link">
          <a href={build.wowheadUrl} target="_blank" rel="noreferrer">
            Open this build on Wowhead
          </a>
        </p>
      )}
    </section>
  );
}

export function TalentPage({ config }: { config: TalentPageConfig }) {
  const [data, setData] = useState<TalentData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setError(null);
    fetch(config.dataUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(String(err)));
  }, [config.dataUrl]);

  if (error) return <p className="error">Failed to load data: {error}</p>;
  if (!data) return <p className="loading">Loading…</p>;

  const builds = config.builds ?? data.builds.filter((b) => b.page === config.page);

  return (
    <div className="page">
      <p className="eyebrow">ShadowPanther Classic · Talents</p>
      <h1>{config.label}</h1>
      <p className="aep-lead">{config.intro}</p>
      <p className="section-note">
        Hover a talent for its Wowhead tooltip, or click it to open the spell. Talent data comes
        from Wowhead's Rogue DPS talent guide.
      </p>
      {builds.map((build) => (
        <Build key={build.key} build={build} data={data} />
      ))}
    </div>
  );
}
