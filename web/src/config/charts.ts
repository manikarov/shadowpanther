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
}

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
  always: ["Source", "Lvl", "AEP", "MAEP", "TAEP"],
  groups: [
    { label: "Origin", columns: ["Loc", "P", "Info", "Set"] },
    { label: "Base Stats", columns: ["Arm", "B"] },
    { label: "Attributes", columns: ["Agi", "Sta", "Str", "AP"] },
    { label: "Hit Values", columns: ["Cri", "Hit", "Par", "Dod", "Def"] },
    { label: "Resistances", columns: ["Ar", "Fi", "Fr", "Na", "Sh"] },
    { label: "Special Values", columns: ["H/5", "PVP", "PVE", "Tank", "Special"] },
  ],
};

const enchantmentColumnGroups: ColumnGroups = {
  always: ["AEP", "MAEP", "TAEP", "Other Effect"],
  groups: [
    { label: "Crafting", columns: ["P", "COMPONENTS"] },
    { label: "Attributes", columns: ["Arm", "Agi", "Sta", "Str", "AP"] },
    { label: "Hit Values", columns: ["Cri", "Dod", "Def"] },
    { label: "Resistances", columns: ["Ar", "Fi", "Fr", "Na", "Sh"] },
    { label: "Special Values", columns: ["HP", "PVP", "PVE", "Tank"] },
  ],
};

export const CHARTS: ChartConfig[] = [
  {
    path: "weapons",
    label: "Weapons",
    dataUrl: "/data/weapons.json",
    specialColumn: "Special",
    columnGroups: weaponColumnGroups,
  },
  {
    path: "daggers",
    label: "Daggers",
    dataUrl: "/data/daggers.json",
    specialColumn: "Special",
    columnGroups: weaponColumnGroups,
  },
  {
    path: "fists",
    label: "Fists",
    dataUrl: "/data/fists.json",
    specialColumn: "Special",
    columnGroups: weaponColumnGroups,
  },
  {
    path: "maces",
    label: "Maces",
    dataUrl: "/data/maces.json",
    specialColumn: "Special",
    columnGroups: weaponColumnGroups,
  },
  {
    path: "swords",
    label: "Swords",
    dataUrl: "/data/swords.json",
    specialColumn: "Special",
    columnGroups: weaponColumnGroups,
  },
  {
    path: "armor",
    label: "Armor",
    dataUrl: "/data/armor.json",
    specialColumn: "Special",
    columnGroups: armorColumnGroups,
  },
  {
    path: "enchantments",
    label: "Enchantments",
    dataUrl: "/data/enchantments.json",
    specialColumn: "Other Effect",
    columnGroups: enchantmentColumnGroups,
  },
];
