export type CellValue = string | number | null;

export interface ItemRecord {
  name: string;
  itemId: number | null;
  wowheadUrl: string | null;
  rarityColor: string | null;
  [column: string]: CellValue;
}

export type ChartData = Record<string, ItemRecord[]>;

export interface GuideMaterial {
  name: string;
  qty: number | null;
  itemId: number | null;
  wowheadUrl: string | null;
}

export interface GuideStep {
  range: string;
  craft: string;
  craftId: number | null;
  craftUrl: string | null;
  qty: number | null;
  materials: string;
  note: string;
}

export interface GuideData {
  profession: string;
  skillCap: number;
  materials: GuideMaterial[];
  steps: GuideStep[];
}

export interface Talent {
  slug: string;
  name: string;
  /** Position in the tree's 7x4 grid. */
  row: number;
  col: number;
  maxPoints: number;
  icon: string | null;
  spellId: number;
  spellUrl: string;
  /** Wowhead's lock text, e.g. "Requires 20 points in Subtlety Talents". */
  requires: string | null;
  description: string;
}

/** A dependency line drawn from a prerequisite talent to the one it unlocks. */
export interface TalentArrow {
  direction: string;
  col: number;
  row: number;
  size: number | null;
  width: number | null;
  height: number | null;
}

export interface TalentTreeData {
  key: string;
  name: string;
  talents: Talent[];
  arrows: TalentArrow[];
}

/** One pick in a levelling order: put `points` more into `slug`. */
export interface TalentOrderStep {
  tree: string;
  slug: string;
  points: number;
}

export interface TalentBuild {
  key: string;
  name: string;
  page: string;
  note: string;
  wowheadCode: string;
  wowheadUrl: string;
  /** tree key -> talent slug -> points spent. */
  points: Record<string, Record<string, number>>;
  /** When set, the page also lists the order and derives `points` from it. */
  order?: TalentOrderStep[];
}

export interface TalentData {
  class: string;
  trees: TalentTreeData[];
  builds: TalentBuild[];
}
