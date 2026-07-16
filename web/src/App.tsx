import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { CHARTS } from "./config/charts";
import { ChartPage } from "./pages/ChartPage";
import { HomePage } from "./pages/HomePage";

function App() {
  return (
    <BrowserRouter>
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
