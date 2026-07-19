import { asset } from "../lib/asset";
import { ENCHANTING_ICON } from "../lib/wow";

export interface ColumnGroup {
  label: string;
  columns: string[];
}

export interface ColumnGroups {
  /** Columns shown by default, never behind a filter chip. */
  always: string[];
  /** Columns hidden by default; a chip toggles each whole group on/off. */
  groups: ColumnGroup[];
}

export interface ChartConfig {
  path: string;
  label: string;
  dataUrl: string;
  /** Column whose presence backs the "only items with X" row filter checkbox. */
  specialColumn?: string;
  columnGroups: ColumnGroups;
  /** Column groups switched on from the start (e.g. show Damage by default). */
  defaultGroups?: string[];
  /** Metric columns pinned to a narrow width so paired values (AEP/MAEP) sit close together. */
  tightColumns?: string[];
  /** Columns that get extra breathing room on their left edge, to separate a numeric block from text. */
  gapBefore?: string[];
  /** Icon for rows with no item of their own, instead of the generic placeholder. */
  fallbackIcon?: string;
  /** Drop the rarity frame and label for charts whose rows aren't items. */
  hideRarity?: boolean;
}

// The AEP/MAEP headline metrics – kept narrow and grouped tightly, with a
// gap before the text column that follows them.
const weaponMetrics = ["AEP", "MAEP"];
const aepMetrics = ["AEP", "MAEP"];

// Shared by Weapons/Daggers/Fists/Maces/Swords - they're all the same parser schema.
const weaponColumnGroups: ColumnGroups = {
  always: ["Source", "Lvl", "AEP", "MAEP", "DPS"],
  groups: [
    { label: "Origin", columns: ["Loc", "P", "Info"] },
    { label: "Base Stats", columns: ["H", "T", "B", "Sp"] },
    { label: "Attributes", columns: ["Agi", "Sta", "Str", "AP", "Sk"] },
    { label: "Hit Values", columns: ["Crit", "Hit"] },
    { label: "Damage", columns: ["Min", "Max", "Avg"] },
    { label: "Special Values", columns: ["PVP", "PVE", "Special"] },
  ],
};

const armorColumnGroups: ColumnGroups = {
  always: ["Source", "Lvl", "AEP", "MAEP"],
  groups: [
    { label: "Origin", columns: ["Loc", "P", "Info", "Set"] },
    { label: "Base Stats", columns: ["Arm", "B"] },
    { label: "Attributes", columns: ["Agi", "Sta", "Str", "AP"] },
    { label: "Hit Values", columns: ["Cri", "Hit", "Par", "Dod", "Def"] },
    { label: "Resistances", columns: ["Ar", "Fi", "Fr", "Na", "Sh"] },
    { label: "Special Values", columns: ["H/5", "PVP", "PVE", "Special"] },
  ],
};

const enchantmentColumnGroups: ColumnGroups = {
  always: ["AEP", "MAEP", "Other Effect"],
  groups: [
    { label: "Crafting", columns: ["P", "COMPONENTS"] },
    { label: "Attributes", columns: ["Arm", "Agi", "Sta", "Str", "AP"] },
    { label: "Hit Values", columns: ["Cri", "Dod", "Def"] },
    { label: "Resistances", columns: ["Ar", "Fi", "Fr", "Na", "Sh"] },
    { label: "Special Values", columns: ["HP", "PVP", "PVE"] },
  ],
};

// Common layout for all melee-weapon charts: show Damage by default, keep the
// AEP/MAEP pair tight, and set off the Source column.
const weaponLayout = {
  specialColumn: "Special",
  columnGroups: weaponColumnGroups,
  defaultGroups: ["Damage"],
  tightColumns: weaponMetrics,
  gapBefore: ["Source"],
} satisfies Partial<ChartConfig>;

export const CHARTS: ChartConfig[] = [
  { path: "weapons", label: "Weapons", dataUrl: asset("data/weapons.json"), ...weaponLayout },
  { path: "daggers", label: "Daggers", dataUrl: asset("data/daggers.json"), ...weaponLayout },
  { path: "fists", label: "Fists", dataUrl: asset("data/fists.json"), ...weaponLayout },
  { path: "maces", label: "Maces", dataUrl: asset("data/maces.json"), ...weaponLayout },
  { path: "swords", label: "Swords", dataUrl: asset("data/swords.json"), ...weaponLayout },
  {
    path: "armor",
    label: "Armor",
    dataUrl: asset("data/armor.json"),
    specialColumn: "Special",
    columnGroups: armorColumnGroups,
    tightColumns: aepMetrics,
    gapBefore: ["Source"],
  },
  {
    path: "enchantments",
    label: "Enchantments",
    dataUrl: asset("data/enchantments.json"),
    specialColumn: "Other Effect",
    columnGroups: enchantmentColumnGroups,
    tightColumns: aepMetrics,
    gapBefore: ["Other Effect"],
    fallbackIcon: ENCHANTING_ICON,
    hideRarity: true,
  },
];

// Display order for the nav and home page (Swords promoted to second).
const CHART_ORDER = ["weapons", "swords", "daggers", "fists", "maces", "armor", "enchantments"];
export const CHARTS_ORDERED: ChartConfig[] = CHART_ORDER.map(
  (path) => CHARTS.find((c) => c.path === path),
).filter((c): c is ChartConfig => Boolean(c));
