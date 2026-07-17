export type CellValue = string | number | null;

export interface ItemRecord {
  name: string;
  itemId: number | null;
  wowheadUrl: string | null;
  rarityColor: string | null;
  [column: string]: CellValue;
}

export type ChartData = Record<string, ItemRecord[]>;

export interface GuideMaterial {
  name: string;
  qty: number | null;
  itemId: number | null;
  wowheadUrl: string | null;
}

export interface GuideStep {
  range: string;
  craft: string;
  craftId: number | null;
  craftUrl: string | null;
  qty: number | null;
  materials: string;
  note: string;
}

export interface GuideData {
  profession: string;
  skillCap: number;
  materials: GuideMaterial[];
  steps: GuideStep[];
}
