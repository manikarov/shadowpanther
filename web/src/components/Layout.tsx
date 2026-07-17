import { NavLink, Outlet } from "react-router-dom";
import { CHARTS } from "../config/charts";

export function Layout() {
  return (
    <>
      <header className="site-header">
        <NavLink to="/" className="brand">
          <img src="/assets/panther_icon.png" alt="" className="brand-logo" />
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
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
