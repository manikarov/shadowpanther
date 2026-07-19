import { NavLink, Outlet } from "react-router-dom";
import { CHARTS_ORDERED } from "../config/charts";
import { GUIDES } from "../config/guides";
import { TALENT_PAGES } from "../config/talents";
import { asset } from "../lib/asset";

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
          {CHARTS_ORDERED.map((c) => (
            <NavLink key={c.path} to={`/${c.path}`}>
              {c.label}
            </NavLink>
          ))}
          <span className="nav-sep" aria-hidden="true" />
          {GUIDES.map((g) => (
            <NavLink key={g.path} to={`/${g.path}`}>
              {g.label}
            </NavLink>
          ))}
          <span className="nav-sep" aria-hidden="true" />
          {TALENT_PAGES.map((t) => (
            <NavLink key={t.path} to={`/${t.path}`}>
              {t.label}
            </NavLink>
          ))}
          <span className="nav-sep" aria-hidden="true" />
          <NavLink to="/aep">AEP Explained</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
