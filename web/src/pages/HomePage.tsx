import { Link } from "react-router-dom";
import { CategoryIcon } from "../components/icons";
import { CHARTS } from "../config/charts";
import { GUIDES } from "../config/guides";
import { asset } from "../lib/asset";

const SOON_GUIDES = [
  "Alliance Questing Guide",
  "Rogue Resistance Gear",
  "Rogue Patch Notes",
];

export function HomePage() {
  return (
    <div>
      <section className="hero">
        <div className="hero-title">
          <img src={asset("assets/panther_icon.png")} alt="" className="hero-logo" />
          <h1>ShadowPanther</h1>
        </div>
        <p>World of Warcraft Classic Rogue Info — Charts, Guides &amp; more.</p>
      </section>

      <section className="category-grid">
        {CHARTS.map((c) => (
          <Link key={c.path} to={`/${c.path}`} className="category-card">
            <CategoryIcon path={c.path} />
            {c.label}
          </Link>
        ))}
      </section>

      <section className="guides">
        <h2>Powerleveling Guides</h2>
        <ul className="guide-list">
          {GUIDES.map((g) => (
            <li key={g.path} className="guide-item">
              <Link to={`/${g.path}`}>{g.label}</Link>
            </li>
          ))}
          {SOON_GUIDES.map((g) => (
            <li key={g} className="guide-item soon" title="Coming soon">
              {g}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
