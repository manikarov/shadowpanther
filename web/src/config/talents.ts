import { asset } from "../lib/asset";
import type { TalentBuild, TalentOrderStep } from "../types";

export interface TalentPageConfig {
  path: string;
  label: string;
  /** Matches the "page" field on each build in the data file. */
  page: string;
  intro: string;
  dataUrl: string;
  /** Hand-curated builds. When set, these replace the ones parsed from the guide. */
  builds?: TalentBuild[];
}

export const TALENT_DATA_URL = asset("data/talents-rogue.json");

// Transcribed from the in-game calculator: 18/32/0, 50 points, level 59.
// Every talent not listed here sits at 0.
const PVE_COMBAT: TalentBuild = {
  key: "pve-combat",
  name: "PVE Combat Rogue",
  page: "combat",
  note: "18 / 32 / 0 — Deflection and Riposte for survivability, Dual Wield Specialization and Aggression for damage, Adrenaline Rush as the cooldown.",
  wowheadCode: "",
  wowheadUrl: "",
  points: {
    assassination: {
      "remorseless-attacks": 2,
      malice: 5,
      murder: 2,
      "improved-slice-and-dice": 3,
      "relentless-strikes": 1,
      lethality: 5,
    },
    combat: {
      "improved-gouge": 3,
      "improved-sinister-strike": 2,
      deflection: 5,
      precision: 5,
      endurance: 2,
      riposte: 1,
      "improved-sprint": 2,
      "dual-wield-specialization": 5,
      "blade-flurry": 1,
      "weapon-expertise": 2,
      aggression: 3,
      "adrenaline-rush": 1,
    },
    subtlety: {},
  },
};

// A levelling order rather than a finished spread: the page accumulates these
// into the final tree and lists the steps underneath it. Ends at 21/3/27.
const SUBTLETY_ORDER: TalentOrderStep[] = [
  { tree: "subtlety", slug: "master-of-deception", points: 1 },
  { tree: "subtlety", slug: "opportunity", points: 3 },
  { tree: "subtlety", slug: "master-of-deception", points: 1 },
  { tree: "subtlety", slug: "camouflage", points: 3 },
  { tree: "subtlety", slug: "elusiveness", points: 2 },
  { tree: "subtlety", slug: "ghostly-strike", points: 1 },
  { tree: "subtlety", slug: "improved-ambush", points: 3 },
  { tree: "subtlety", slug: "opportunity", points: 1 },
  { tree: "subtlety", slug: "serrated-blades", points: 3 },
  { tree: "subtlety", slug: "opportunity", points: 1 },
  { tree: "subtlety", slug: "master-of-deception", points: 1 },
  { tree: "subtlety", slug: "preparation", points: 1 },
  { tree: "subtlety", slug: "hemorrhage", points: 1 },
  { tree: "subtlety", slug: "dirty-deeds", points: 1 },
  { tree: "subtlety", slug: "heightened-senses", points: 1 },
  { tree: "combat", slug: "improved-gouge", points: 3 },
  { tree: "assassination", slug: "improved-eviscerate", points: 3 },
  { tree: "assassination", slug: "remorseless-attacks", points: 2 },
  { tree: "assassination", slug: "malice", points: 5 },
  { tree: "assassination", slug: "relentless-strikes", points: 1 },
  { tree: "assassination", slug: "lethality", points: 5 },
  { tree: "assassination", slug: "improved-slice-and-dice", points: 2 },
  { tree: "assassination", slug: "vile-poisons", points: 2 },
  { tree: "assassination", slug: "cold-blood", points: 1 },
  { tree: "subtlety", slug: "dirty-deeds", points: 1 },
  { tree: "subtlety", slug: "master-of-deception", points: 1 },
  { tree: "subtlety", slug: "camouflage", points: 1 },
];

const PVP_SUBTLETY: TalentBuild = {
  key: "subtlety-order",
  name: "PVP Subtlety Rogue",
  page: "subtlety",
  note: "21 / 3 / 27 — Hemorrhage as the combo builder, Preparation for a second Vanish and Blind.",
  wowheadCode: "",
  wowheadUrl: "",
  points: {},
  order: SUBTLETY_ORDER,
};

export const TALENT_PAGES: TalentPageConfig[] = [
  {
    path: "talents/combat",
    label: "PVE Combat Rogue",
    page: "combat",
    intro: "The raid build, straight from the in-game talent calculator.",
    dataUrl: TALENT_DATA_URL,
    builds: [PVE_COMBAT],
  },
  {
    path: "talents/subtlety",
    label: "PVP Subtlety Rogue",
    page: "subtlety",
    intro:
      "The PvP build, reaching deep into Subtlety for Preparation and the stealth tools. The order the points go in while levelling is listed below the trees.",
    dataUrl: TALENT_DATA_URL,
    builds: [PVP_SUBTLETY],
  },
];
