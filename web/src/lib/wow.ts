import { asset } from "./asset";

// WoW item quality colors (matches the game's own rarity color scheme).
const RARITY: Record<string, { hex: string; label: string }> = {
  gray: { hex: "#9D9D9D", label: "Poor" },
  white: { hex: "#ffffff", label: "Common" },
  green: { hex: "#4ADE6E", label: "Uncommon" },
  blue: { hex: "#3FA1FF", label: "Rare" },
  purple: { hex: "#B26CFF", label: "Epic" },
  orange: { hex: "#FF8C1A", label: "Legendary" },
};

export function rarityHex(color: string | null | undefined): string {
  if (!color) return RARITY.white.hex;
  return RARITY[color.toLowerCase()]?.hex ?? RARITY.white.hex;
}

export function rarityLabel(color: string | null | undefined): string {
  if (!color) return RARITY.white.label;
  return RARITY[color.toLowerCase()]?.label ?? RARITY.white.label;
}

export const RARITY_LEGEND = [RARITY.orange, RARITY.purple, RARITY.blue, RARITY.green];

export const PLACEHOLDER_ICON = asset("assets/icon-placeholder.jpg");

// Enchant rows are effects, not items, so most have no item to take an icon
// from. The Enchanting profession icon (ui_profession_enchanting) stands in
// for all of them.
export const ENCHANTING_ICON = asset("assets/icon-enchanting.jpg");
