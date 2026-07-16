// WoW item quality colors (matches the game's own rarity color scheme).
const RARITY: Record<string, { hex: string; label: string }> = {
  gray: { hex: "#9D9D9D", label: "Schlecht" },
  white: { hex: "#ffffff", label: "Gewöhnlich" },
  green: { hex: "#4ADE6E", label: "Ungewöhnlich" },
  blue: { hex: "#3FA1FF", label: "Selten" },
  purple: { hex: "#B26CFF", label: "Episch" },
  orange: { hex: "#FF8C1A", label: "Legendär" },
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

export const PLACEHOLDER_ICON = "/assets/icon-placeholder.jpg";
