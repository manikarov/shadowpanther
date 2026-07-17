import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { asset } from "./asset";

// itemId -> Wowhead icon name (e.g. "inv_sword_61"), built at data-sync time
// by scripts/fetch_icons.py. The actual images live in assets/icons/items/.
type IconMap = Record<string, string>;

const IconContext = createContext<IconMap>({});

export function IconProvider({ children }: { children: ReactNode }) {
  const [map, setMap] = useState<IconMap>({});
  useEffect(() => {
    fetch(asset("data/icons.json"))
      .then((res) => (res.ok ? res.json() : {}))
      .then(setMap)
      .catch(() => setMap({}));
  }, []);
  return <IconContext.Provider value={map}>{children}</IconContext.Provider>;
}

/** Local icon URL for an item, or null if we have no icon mapped for it. */
export function useItemIcon(itemId: number | string | null | undefined): string | null {
  const map = useContext(IconContext);
  if (itemId == null) return null;
  const icon = map[String(itemId)];
  return icon ? asset(`assets/icons/items/${icon}.jpg`) : null;
}
