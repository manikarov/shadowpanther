export interface ExtraPageConfig {
  path: string;
  label: string;
}

// Reference pages that aren't charts, profession guides or builds. Each one has
// its own component, so the routes stay spelled out in App.tsx; this list is
// what the nav and the home page render.
export const EXTRA_PAGES: ExtraPageConfig[] = [{ path: "aep", label: "AEP Explained" }];
