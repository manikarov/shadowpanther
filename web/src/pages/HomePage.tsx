import { Link } from "react-router-dom";
import { CategoryIcon } from "../components/icons";
import { CHARTS_ORDERED } from "../config/charts";
import { EXTRA_PAGES } from "../config/extras";
import { GUIDES } from "../config/guides";
import { TALENT_PAGES } from "../config/talents";
import { asset } from "../lib/asset";

// Shared display order (Swords sits second); used by the nav and these tiles.
const HOME_CHARTS = CHARTS_ORDERED;

export function HomePage() {
  return (
    <div>
      <section className="hero">
        <div className="hero-title">
          <img src={asset("assets/icons/panther_icon.png")} alt="" className="hero-logo" />
          <h1>ShadowPanther</h1>
        </div>
        <p>World of Warcraft Classic Rogue Info — Charts, Guides &amp; more.</p>
      </section>

      <section className="category-grid">
        {HOME_CHARTS.map((c) => (
          <Link key={c.path} to={`/${c.path}`} className="category-card">
            <CategoryIcon path={c.path} />
            {c.label}
          </Link>
        ))}
      </section>

      <div className="guide-columns">
        <section className="guides">
          <h2>Profession Guides</h2>
          <ul className="guide-list">
            {GUIDES.map((g) => (
              <li key={g.path} className="guide-item">
                <Link to={`/${g.path}`}>{g.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="guides">
          <h2>Rogue Builds</h2>
          <ul className="guide-list">
            {TALENT_PAGES.map((t) => (
              <li key={t.path} className="guide-item">
                <Link to={`/${t.path}`}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="guides">
          <h2>Extras</h2>
          <ul className="guide-list">
            {EXTRA_PAGES.map((e) => (
              <li key={e.path} className="guide-item">
                <Link to={`/${e.path}`}>{e.label}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="credits">
        <h2>Credits</h2>
        <p>
          Every chart, gear rating and levelling route on this site comes from{" "}
          <strong>ShadowPanther</strong> and his site{" "}
          <a href="https://shadowpanther.net/" target="_blank" rel="noreferrer">
            shadowpanther.net
          </a>
          . Collecting all these weapons, armor pieces and enchantments — and keeping them
          current for years — is entirely his work. Only the frontend was rebuilt here.
        </p>
        <p>If any of it helps you, the credit belongs to the original site. Go have a look.</p>
      </aside>
    </div>
  );
}
