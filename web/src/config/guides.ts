import { asset } from "../lib/asset";

export interface GuideConfig {
  path: string;
  label: string;
  profession: string;
  dataUrl: string;
}

export const GUIDES: GuideConfig[] = [
  {
    path: "guides/blacksmithing",
    label: "Blacksmithing",
    profession: "Blacksmithing",
    dataUrl: asset("data/guide-blacksmithing.json"),
  },
  {
    path: "guides/leatherworking",
    label: "Leatherworking",
    profession: "Leatherworking",
    dataUrl: asset("data/guide-leatherworking.json"),
  },
  {
    path: "guides/engineering",
    label: "Engineering",
    profession: "Engineering",
    dataUrl: asset("data/guide-engineering.json"),
  },
];
