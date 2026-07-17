import { NavLink, Outlet } from "react-router-dom";
import { CHARTS } from "../config/charts";
import { GUIDES } from "../config/guides";
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
          {CHARTS.map((c) => (
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
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
