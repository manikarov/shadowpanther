// Minimalist line-art icons for the category nav, one per chart type.
// Stroke-only, single color (currentColor) so they inherit the card's text color.
import { asset } from "../lib/asset";

const common = {
  viewBox: "0 0 32 32",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function SwordsIcon() {
  return (
    <svg {...common}>
      <path d="M13.5 19 16 4l2.5 15" />
      <path d="M10 19h12" />
      <path d="M16 19v7" />
      <circle cx="16" cy="28" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function DaggersIcon() {
  return (
    <svg {...common}>
      <path d="M14 20 16 9l2 11" />
      <path d="M12 20h8" />
      <path d="M16 20v6" />
      <circle cx="16" cy="27.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

export function MacesIcon() {
  return (
    <svg {...common}>
      <path d="M16 13v13" />
      <circle cx="16" cy="8" r="5" />
      <path d="M16 3v2M21 8h2M16 13v-2M11 8H9" />
      <path d="M19.5 4.5l1.5-1.5M19.5 11.5l1.5 1.5M12.5 4.5L11 3M12.5 11.5L11 13" />
    </svg>
  );
}

export function FistsIcon() {
  return (
    <svg {...common}>
      <path d="M9 14v-3a2 2 0 1 1 4 0v3" />
      <path d="M13 14v-4a2 2 0 1 1 4 0v4" />
      <path d="M17 14v-3a2 2 0 1 1 4 0v3" />
      <path d="M21 14v-1a2 2 0 1 1 4 0v6c0 3.5-2.5 6-6.5 6h-4C11 25 9 23 9 20v-2" />
    </svg>
  );
}

export function WeaponsIcon() {
  return (
    <svg {...common}>
      <path d="M7 25 23 9" />
      <path d="M20 6l3 3-2.5 2.5-3-3z" />
      <path d="M25 25 9 9" />
      <path d="M9 6L6 9l2.5 2.5 3-3z" />
    </svg>
  );
}

export function ArmorIcon() {
  return (
    <svg {...common}>
      <path d="M16 5c3 2 5 2 7 1v9c0 6-3.5 9.5-7 11-3.5-1.5-7-5-7-11V6c2 1 4 1 7-1z" />
    </svg>
  );
}

export function EnchantmentsIcon() {
  return (
    <svg {...common}>
      <path d="M16 5l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" />
    </svg>
  );
}

export function PlaceholderIcon() {
  return (
    <svg {...common}>
      <rect x="7" y="7" width="18" height="18" rx="3" />
      <path d="M12 12h8v8h-8z" />
    </svg>
  );
}

export function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
      <circle cx="9" cy="9" r="6" />
      <path d="M17.5 17.5 13.5 13.5" />
    </svg>
  );
}

const ICONS: Record<string, () => React.JSX.Element> = {
  weapons: WeaponsIcon,
  daggers: DaggersIcon,
  fists: FistsIcon,
  maces: MacesIcon,
  swords: SwordsIcon,
  armor: ArmorIcon,
  enchantments: EnchantmentsIcon,
};

// Painted gold panel icons (cropped from the category-icons sheet). The SVG
// line icons above stay as a fallback if an image is ever missing.
export function CategoryIcon({ path }: { path: string }) {
  const Icon = ICONS[path] ?? PlaceholderIcon;
  if (ICONS[path]) {
    return <img className="category-icon-img" src={asset(`assets/icons/${path}.png`)} alt="" />;
  }
  return (
    <span className="category-icon">
      <Icon />
    </span>
  );
}
