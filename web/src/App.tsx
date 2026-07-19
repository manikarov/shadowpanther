import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CHARTS } from "./config/charts";
import { GUIDES } from "./config/guides";
import { TALENT_PAGES } from "./config/talents";
import { IconProvider } from "./lib/icons";
import { AepPage } from "./pages/AepPage";
import { ChartPage } from "./pages/ChartPage";
import { GuidePage } from "./pages/GuidePage";
import { HomePage } from "./pages/HomePage";
import { TalentPage } from "./pages/TalentPage";

// Strip the trailing slash from Vite's BASE_URL ("/shadowpanther/" -> "/shadowpanther",
// "/" -> "") so React Router serves routes correctly under the Pages subpath.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <BrowserRouter basename={basename}>
      <IconProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            {CHARTS.map((config) => (
              <Route key={config.path} path={config.path} element={<ChartPage config={config} />} />
            ))}
            {GUIDES.map((config) => (
              <Route key={config.path} path={config.path} element={<GuidePage config={config} />} />
            ))}
            {TALENT_PAGES.map((config) => (
              <Route key={config.path} path={config.path} element={<TalentPage config={config} />} />
            ))}
            <Route path="aep" element={<AepPage />} />
          </Route>
        </Routes>
      </IconProvider>
    </BrowserRouter>
  );
}

export default App;
