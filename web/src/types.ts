export type CellValue = string | number | null;

export interface ItemRecord {
  name: string;
  itemId: number | null;
  wowheadUrl: string | null;
  rarityColor: string | null;
  [column: string]: CellValue;
}

export type ChartData = Record<string, ItemRecord[]>;
