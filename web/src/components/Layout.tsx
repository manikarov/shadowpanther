import { NavLink, Outlet } from "react-router-dom";
import { CHARTS_ORDERED } from "../config/charts";
import { EXTRA_PAGES } from "../config/extras";
import { GUIDES } from "../config/guides";
import { TALENT_PAGES } from "../config/talents";
import { asset } from "../lib/asset";
import { NavMenu, type NavItem } from "./NavMenu";

const pick = ({ path, label }: NavItem): NavItem => ({ path, label });

// The nav is grouped into dropdowns; spelling all 13 links out made it wrap.
const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Charts", items: CHARTS_ORDERED.map(pick) },
  { label: "Professions", items: GUIDES.map(pick) },
  { label: "Builds", items: TALENT_PAGES.map(pick) },
  { label: "Extras", items: EXTRA_PAGES.map(pick) },
];

export function Layout() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <img src={asset("assets/icons/panther_icon.png")} alt="" className="brand-logo" />
          <span className="wordmark">
            ShadowPanther <span>Classic</span>
          </span>
        </NavLink>
        <nav className="site-nav">
          {NAV_GROUPS.map((group) => (
            <NavMenu key={group.label} label={group.label} items={group.items} />
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
