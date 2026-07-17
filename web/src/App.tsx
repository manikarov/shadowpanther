import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CHARTS } from "./config/charts";
import { ChartPage } from "./pages/ChartPage";
import { HomePage } from "./pages/HomePage";

// Strip the trailing slash from Vite's BASE_URL ("/shadowpanther/" -> "/shadowpanther",
// "/" -> "") so React Router serves routes correctly under the Pages subpath.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          {CHARTS.map((config) => (
            <Route key={config.path} path={config.path} element={<ChartPage config={config} />} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
