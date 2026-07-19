// AEP / MAEP stat weights, reverse-engineered from the original ShadowPanther
// spreadsheets in old/ and verified against every row in data/: applying these
// weights reproduces the published AEP and MAEP columns exactly (the only
// exception is "Skull of Impending Doom", whose value is hand-set).
//
// AEP  = Agility Equivalence Points, PVP-oriented.
// MAEP = Maximum DPS AEP, tuned for PVE raid damage.

export interface WeightRow {
  /** Stat as it appears in the chart legend. */
  label: string;
  aep: number;
  maep: number;
  /** Shown under the row when the two weights differ for a reason worth stating. */
  note?: string;
}

export const ARMOR_WEIGHTS: WeightRow[] = [
  { label: "Agility", aep: 1, maep: 1, note: "The anchor: every other stat is priced in agility points, so agility is 1 by definition." },
  { label: "Stamina", aep: 1, maep: 0.01, note: "Survivability decides duels, but contributes nothing to raid damage." },
  { label: "Strength", aep: 0.5, maep: 0.55 },
  { label: "Attack Power", aep: 0.5, maep: 0.55 },
  { label: "Crit chance (per 1%)", aep: 10, maep: 13 },
  { label: "Hit chance (per 1%)", aep: 7.5, maep: 10 },
  { label: "Parry (per 1%)", aep: 4, maep: 0.01 },
  { label: "Dodge (per 1%)", aep: 2, maep: 0.01 },
  { label: "Defense", aep: 0.4, maep: 0.01 },
  { label: "Armor", aep: 0.01, maep: 0.001 },
  { label: "Resistances", aep: 0.1, maep: 0.01 },
  { label: "Health per 5 sec", aep: 0.1, maep: 0.01 },
  { label: "Special value", aep: 1, maep: 1, note: "A hand-assigned score for set bonuses, procs and on-use effects, which a linear formula cannot express." },
];

export const WEAPON_WEIGHTS: WeightRow[] = [
  { label: "Agility", aep: 1, maep: 1 },
  { label: "Stamina", aep: 1, maep: 0.01 },
  { label: "Strength", aep: 0.5, maep: 0.55 },
  { label: "Attack Power", aep: 0.5, maep: 0.55 },
  { label: "Weapon Skill", aep: 1, maep: 15, note: "The single biggest PVP/PVE split. Weapon skill cuts misses and glancing blows against level-63 raid bosses; against players it does almost nothing." },
  { label: "Crit chance (per 1%)", aep: 10, maep: 13 },
  { label: "Hit chance (per 1%)", aep: 7.5, maep: 10 },
  { label: "Special value", aep: 0.8, maep: 0.8, note: "Weighted 0.8 on a main hand, but only 0.1 on an off hand." },
];

/** The weapon-damage part of the formula, which differs by hand. */
export const WEAPON_TERMS = [
  {
    hand: "Main Hand",
    formula: "1 × DPS  +  2 × Avg Damage",
    explanation:
      "Damage per hit counts double, DPS only single — so a slow main hand wins. That is the formula encoding Backstab, Ambush and Sinister Strike, which add a flat bonus on top of the weapon's swing: the fewer, bigger hits you land, the more that bonus is worth.",
  },
  {
    hand: "Off Hand",
    formula: "3 × DPS  +  (155 − 50 × Speed)",
    explanation:
      "Average damage is worth nothing here, because off-hand swings never carry a special attack. Instead the speed term pays roughly 5 points for every 0.1 seconds of extra speed — fast off hands land more poison procs and more Sword Specialization procs.",
  },
];

// ---------------------------------------------------------------------------
// Worked examples. Values are the real chart entries, and the totals below are
// computed from the weights above rather than copied, so they cannot drift.
// ---------------------------------------------------------------------------

export interface CalcLine {
  label: string;
  /** Displayed stat value, e.g. "16" or "1%". */
  value: string;
  weight: number;
  points: number;
  /** Rendered as a formula fragment instead of "value × weight". */
  raw?: string;
}

export interface WorkedExample {
  name: string;
  wowheadUrl: string;
  subtitle: string;
  aepLines: CalcLine[];
  maepLines: CalcLine[];
  /** The value printed in the chart, for comparison. */
  publishedAep: number;
  publishedMaep: number;
}

const KINGSFALL_SPEED = 1.8;
const KINGSFALL_AVG = (105 + 158) / 2;
const KINGSFALL_DPS = KINGSFALL_AVG / KINGSFALL_SPEED;

function line(label: string, value: string, amount: number, weight: number, raw?: string): CalcLine {
  return { label, value, weight, points: amount * weight, raw };
}

export const EXAMPLE_WEAPON: WorkedExample = {
  name: "Kingsfall",
  wowheadUrl: "https://www.wowhead.com/classic/item=22802",
  subtitle: "Main-hand dagger · 105–158 damage · speed 1.80 · 16 Agility · 1% crit · 1% hit",
  publishedAep: 369.56,
  publishedMaep: 375.06,
  aepLines: [
    line("DPS", KINGSFALL_DPS.toFixed(2), KINGSFALL_DPS, 1),
    line("Average damage", KINGSFALL_AVG.toFixed(1), KINGSFALL_AVG, 2),
    line("Agility", "16", 16, 1),
    line("Crit chance", "1%", 1, 10),
    line("Hit chance", "1%", 1, 7.5),
  ],
  maepLines: [
    line("DPS", KINGSFALL_DPS.toFixed(2), KINGSFALL_DPS, 1),
    line("Average damage", KINGSFALL_AVG.toFixed(1), KINGSFALL_AVG, 2),
    line("Agility", "16", 16, 1),
    line("Crit chance", "1%", 1, 13),
    line("Hit chance", "1%", 1, 10),
  ],
};

export const EXAMPLE_OFFHAND: WorkedExample = {
  name: "Kingsfall (as an off hand)",
  wowheadUrl: "https://www.wowhead.com/classic/item=22802",
  subtitle: "Same dagger, scored by the off-hand formula — note how the speed term replaces average damage",
  publishedAep: 317.67,
  publishedMaep: 323.17,
  aepLines: [
    line("DPS", KINGSFALL_DPS.toFixed(2), KINGSFALL_DPS, 3),
    { label: "Speed term", value: "1.80", weight: 0, points: 155 - 50 * KINGSFALL_SPEED, raw: "155 − 50 × 1.80" },
    line("Agility", "16", 16, 1),
    line("Crit chance", "1%", 1, 10),
    line("Hit chance", "1%", 1, 7.5),
  ],
  maepLines: [
    line("DPS", KINGSFALL_DPS.toFixed(2), KINGSFALL_DPS, 3),
    { label: "Speed term", value: "1.80", weight: 0, points: 155 - 50 * KINGSFALL_SPEED, raw: "155 − 50 × 1.80" },
    line("Agility", "16", 16, 1),
    line("Crit chance", "1%", 1, 13),
    line("Hit chance", "1%", 1, 10),
  ],
};

export const EXAMPLE_ARMOR: WorkedExample = {
  name: "Bonescythe Helmet",
  wowheadUrl: "https://www.wowhead.com/classic/item=22478",
  subtitle: "205 armor · 30 Agility · 29 Stamina · 18 Strength · 2% crit · 1% hit",
  publishedAep: 97.55,
  publishedMaep: 76.4,
  aepLines: [
    line("Agility", "30", 30, 1),
    line("Stamina", "29", 29, 1),
    line("Strength", "18", 18, 0.5),
    line("Crit chance", "2%", 2, 10),
    line("Hit chance", "1%", 1, 7.5),
    line("Armor", "205", 205, 0.01),
  ],
  maepLines: [
    line("Agility", "30", 30, 1),
    line("Stamina", "29", 29, 0.01),
    line("Strength", "18", 18, 0.55),
    line("Crit chance", "2%", 2, 13),
    line("Hit chance", "1%", 1, 10),
    line("Armor", "205", 205, 0.001),
  ],
};

export const WORKED_EXAMPLES = [EXAMPLE_WEAPON, EXAMPLE_OFFHAND, EXAMPLE_ARMOR];

export function sumPoints(lines: CalcLine[]): number {
  return lines.reduce((total, l) => total + l.points, 0);
}
