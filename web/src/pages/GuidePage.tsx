import { useEffect, useState } from "react";
import type { GuideConfig } from "../config/guides";
import { useItemIcon } from "../lib/icons";
import { PLACEHOLDER_ICON } from "../lib/wow";
import type { GuideData, GuideStep } from "../types";

function StepRow({ step }: { step: GuideStep }) {
  const iconUrl = useItemIcon(step.craftId);

  // A step with no craft is a milestone/instruction that spans the whole row.
  if (!step.craft) {
    return (
      <tr className="milestone-row">
        <td colSpan={6}>{step.note}</td>
      </tr>
    );
  }

  const craft = step.craftUrl ? (
    <a href={step.craftUrl} target="_blank" rel="noreferrer" className="craft-link">
      {step.craft}
    </a>
  ) : (
    step.craft
  );

  return (
    <tr>
      <td className="col-range">{step.range}</td>
      <td className="col-icon">
        <span className="guide-craft-icon">
          <img
            src={iconUrl ?? PLACEHOLDER_ICON}
            alt=""
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fallback) {
                img.dataset.fallback = "1";
                img.src = PLACEHOLDER_ICON;
              }
            }}
          />
        </span>
      </td>
      <td className="col-craft">{craft}</td>
      <td className="col-qty num">{step.qty != null ? `×${step.qty}` : ""}</td>
      <td className="col-mats">{step.materials}</td>
      <td className="col-note">{step.note}</td>
    </tr>
  );
}

export function GuidePage({ config }: { config: GuideConfig }) {
  const [data, setData] = useState<GuideData | null>(null);
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

  if (error) return <p className="error">Failed to load guide: {error}</p>;
  if (!data) return <p className="loading">Loading…</p>;

  return (
    <div className="page">
      <p className="eyebrow">ShadowPanther Classic · Powerleveling</p>
      <h1>
        {config.label} <span className="cap">1 → {data.skillCap}</span>
      </h1>

      <section className="chart-section">
        <h2>Total Materials Needed</h2>
        <ul className="material-list">
          {data.materials.map((m, i) => (
            <li key={`${m.name}-${i}`} className="material-chip">
              {m.wowheadUrl ? (
                <a href={m.wowheadUrl} target="_blank" rel="noreferrer">
                  {m.name}
                </a>
              ) : (
                <span>{m.name}</span>
              )}
              {m.qty != null && <b>×{m.qty}</b>}
            </li>
          ))}
        </ul>
      </section>

      <section className="chart-section">
        <h2>Step-by-Step Route</h2>
        <div className="table-scroll">
          <table className="data-table guide-table">
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "29%" }} />
            <col style={{ width: "28%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Skill</th>
              <th aria-label="Icon" />
              <th>Craft</th>
              <th className="num">Qty</th>
              <th>Materials</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {data.steps.map((step, i) => (
              <StepRow key={i} step={step} />
            ))}
          </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
