import { Link } from "react-router-dom";
import { CategoryIcon } from "../components/icons";
import { CHARTS } from "../config/charts";

const GUIDES = [
  "Blacksmithing Guide",
  "Leatherworking Guide",
  "Engineering Guide",
  "Alliance Questing Guide",
  "Rogue Resistance Gear",
  "Rogue Patch Notes",
];

export function HomePage() {
  return (
    <div>
      <section className="hero">
        <h1>ShadowPanther</h1>
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
        <h2>Guides</h2>
        <ul className="guide-list">
          {GUIDES.map((g) => (
            <li key={g} className="guide-item soon" title="Coming soon">
              {g}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
