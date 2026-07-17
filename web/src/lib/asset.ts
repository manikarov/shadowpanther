// Resolves a public asset/data path against Vite's base URL, so the same code
// works at the dev-server root ("/") and under the GitHub Pages subpath
// ("/shadowpanther/"). Pass paths without a leading slash, e.g. asset("data/x.json").
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}
