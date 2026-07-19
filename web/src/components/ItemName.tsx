import { useItemIcon } from "../lib/icons";
import { PLACEHOLDER_ICON, rarityHex, rarityLabel } from "../lib/wow";
import type { ItemRecord } from "../types";

export function ItemName({
  item,
  fallbackIcon,
  showRarity = true,
}: {
  item: ItemRecord;
  fallbackIcon?: string;
  /** Off for charts whose rows carry no item rarity, so every row would read "Common". */
  showRarity?: boolean;
}) {
  const color = rarityHex(item.rarityColor);
  const iconUrl = useItemIcon(item.itemId);
  const fallback = fallbackIcon ?? PLACEHOLDER_ICON;

  const content = (
    <div className="item-cell">
      <div
        className={showRarity ? "icon-frame" : "icon-frame plain"}
        style={showRarity ? { borderColor: color, color } : undefined}
      >
        <img
          src={iconUrl ?? fallback}
          alt=""
          loading="lazy"
          onError={(e) => {
            // Fall back if a mapped icon 404s (once, no loop).
            const img = e.currentTarget;
            if (!img.dataset.fallback) {
              img.dataset.fallback = "1";
              img.src = fallback;
            }
          }}
        />
      </div>
      <div>
        <div className="item-name-text">{item.name}</div>
        {showRarity && (
          <div className="item-rarity" style={{ color }}>
            {rarityLabel(item.rarityColor)}
          </div>
        )}
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
