import { useItemIcon } from "../lib/icons";
import { PLACEHOLDER_ICON, rarityHex, rarityLabel } from "../lib/wow";
import type { ItemRecord } from "../types";

export function ItemName({ item }: { item: ItemRecord }) {
  const color = rarityHex(item.rarityColor);
  const iconUrl = useItemIcon(item.itemId);

  const content = (
    <div className="item-cell">
      <div className="icon-frame" style={{ borderColor: color, color }}>
        <img
          src={iconUrl ?? PLACEHOLDER_ICON}
          alt=""
          loading="lazy"
          onError={(e) => {
            // Fall back to the placeholder if a mapped icon 404s (once, no loop).
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = "1";
              img.src = PLACEHOLDER_ICON;
            }
          }}
        />
      </div>
      <div>
        <div className="item-name-text">{item.name}</div>
        <div className="item-rarity" style={{ color }}>
          {rarityLabel(item.rarityColor)}
        </div>
      </div>
    </div>
  );

  if (!item.wowheadUrl) {
    return <span className="item-name">{content}</span>;
  }

  return (
    <a className="item-name" href={item.wowheadUrl} target="_blank" rel="noreferrer">
      {content}
    </a>
  );
}
