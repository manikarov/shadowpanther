import {
  ARMOR_WEIGHTS,
  WEAPON_TERMS,
  WEAPON_WEIGHTS,
  WORKED_EXAMPLES,
  sumPoints,
  type CalcLine,
  type WeightRow,
  type WorkedExample,
} from "../config/aep";

/** Trim trailing zeros so weights read as "0.5" and "10", not "0.50" and "10.00". */
function fmt(n: number, decimals = 2): string {
  return Number(n.toFixed(decimals)).toString();
}

function WeightTable({ rows, caption }: { rows: WeightRow[]; caption: string }) {
  return (
    <div className="table-scroll">
      <table className="data-table aep-table">
        <caption className="aep-caption">{caption}</caption>
        <colgroup>
          <col />
          <col style={{ width: "6.5em" }} />
          <col style={{ width: "6.5em" }} />
        </colgroup>
        <thead>
          <tr>
            <th>Stat</th>
            <th className="num">AEP</th>
            <th className="num">MAEP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>
                {row.label}
                {row.note && <span className="aep-row-note">{row.note}</span>}
              </td>
              <td className="num">{fmt(row.aep, 3)}</td>
              <td className={`num${row.maep !== row.aep ? " aep-differs" : ""}`}>{fmt(row.maep, 3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CalcColumn({ title, lines, published }: { title: string; lines: CalcLine[]; published: number }) {
  const total = sumPoints(lines);

  return (
    <div className="calc-column">
      <h4>{title}</h4>
      <table className="data-table calc-table">
        <tbody>
          {lines.map((l) => (
            <tr key={l.label}>
              <td>{l.label}</td>
              <td className="num calc-term">{l.raw ?? `${l.value} × ${fmt(l.weight, 3)}`}</td>
              <td className="num calc-points">{fmt(l.points)}</td>
            </tr>
          ))}
          <tr className="calc-total">
            <td colSpan={2}>Total</td>
            <td className="num">{fmt(total)}</td>
          </tr>
        </tbody>
      </table>
      <p className="calc-check">Published in the chart: {fmt(published)}</p>
    </div>
  );
}

function Example({ example }: { example: WorkedExample }) {
  return (
    <div className="calc-block">
      <h3>
        <a href={example.wowheadUrl} target="_blank" rel="noreferrer">
          {example.name}
        </a>
      </h3>
      <p className="calc-subtitle">{example.subtitle}</p>
      <div className="calc-grid">
        <CalcColumn title="AEP (PVP)" lines={example.aepLines} published={example.publishedAep} />
        <CalcColumn title="MAEP (PVE)" lines={example.maepLines} published={example.publishedMaep} />
      </div>
    </div>
  );
}

export function AepPage() {
  return (
    <div className="page">
      <p className="eyebrow">ShadowPanther Classic · Reference</p>
      <h1>How AEP &amp; MAEP Work</h1>

      <p className="aep-lead">
        Every chart on this site ranks items by a single number. <b>AEP</b> stands for{" "}
        <i>Agility Equivalence Points</i>: each stat is converted into "how much agility is this worth",
        and the results are added up. <b>MAEP</b> — <i>Maximum DPS AEP</i> — is the same machine with
        different weights, tuned for raid damage instead of PVP. The idea goes back to a forum
        discussion by Ming of Lightning's Blade, and the weights below are the ones the original
        ShadowPanther spreadsheets actually use.
      </p>

      <section className="chart-section">
        <h2>The Formula</h2>
        <div className="formula-box">
          <span className="formula-main">AEP = Σ ( stat value × stat weight )</span>
          <span className="formula-sub">…and for weapons, plus a weapon-damage term that depends on the hand.</span>
        </div>
        <p className="section-note">
          That is the whole model. It is linear, which is what makes it transparent and instantly
          sortable — and also where its limits come from, as explained at the bottom of this page.
        </p>
      </section>

      <section className="chart-section">
        <h2>Stat Weights — Armor, Rings, Trinkets &amp; Enchants</h2>
        <WeightTable
          rows={ARMOR_WEIGHTS}
          caption="AEP is PVP-oriented, MAEP tuned for raid DPS. Agility is 1 by definition — everything else is priced against it."
        />
      </section>

      <section className="chart-section">
        <h2>Stat Weights — Weapons</h2>
        <WeightTable
          rows={WEAPON_WEIGHTS}
          caption="The same attributes as armor, but weapon skill is priced completely differently."
        />

        <h3 className="aep-subhead">Plus the weapon-damage term</h3>
        <div className="hand-grid">
          {WEAPON_TERMS.map((term) => (
            <div key={term.hand} className="hand-card">
              <h4>{term.hand}</h4>
              <code className="hand-formula">{term.formula}</code>
              <p>{term.explanation}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="chart-section">
        <h2>Worked Examples</h2>
        <p className="section-note">
          Real entries from the charts, calculated line by line. The totals are computed from the
          weights on this page, so if they match the published values, the weights are right.
        </p>
        {WORKED_EXAMPLES.map((example) => (
          <Example key={example.name} example={example} />
        ))}
      </section>

      <section className="chart-section">
        <h2>What The Formula Cannot Do</h2>
        <p className="aep-lead">
          AEP is an excellent first pass and a terrible last word. Three things are worth knowing
          before you trust a sort order.
        </p>
        <ul className="caveat-list">
          <li>
            <b>Caps are invisible to it.</b> Hit chance stops helping once you reach the hit cap, and
            weapon skill stops at 305. The formula keeps paying full price anyway, so items loaded
            with hit or skill get over-valued once you are already capped.
          </li>
          <li>
            <b>The weights are fixed, your character is not.</b> What a point of crit is really worth
            depends on your attack power, your buffs and your talents. Everyone sorting these charts
            shares one set of averages.
          </li>
          <li>
            <b>Procs and set bonuses do not fit.</b> They are handled by the hand-assigned
            PVP/PVE special-value columns — a judgement call bolted onto the model, not a
            calculation.
          </li>
        </ul>
        <p className="section-note">
          A reasonable workflow: shortlist with AEP or MAEP, check your caps yourself, then simulate
          the last few candidates.
        </p>
      </section>
    </div>
  );
}
