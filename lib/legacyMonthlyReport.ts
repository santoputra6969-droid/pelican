import { readFileSync } from "node:fs";
import { join } from "node:path";

type LegacyCategory = "SEMUA" | "UTAMA" | "PKK";

type LegacyRow = {
  year: number;
  month: number;
  monthLabel: string;
  category: LegacyCategory;
  masuk: number;
  keluar: number;
};

type LegacyDataset = {
  years: string[];
  count: number;
  results: LegacyRow[];
};

let cache: LegacyDataset | null = null;

function loadDataset(): LegacyDataset | null {
  if (cache) return cache;
  try {
    const file = join(process.cwd(), "prisma", "scraped", "journal_report_monthly.json");
    cache = JSON.parse(readFileSync(file, "utf8")) as LegacyDataset;
    return cache;
  } catch {
    return null;
  }
}

export function getLegacyMonthlyRow(
  year: number,
  month: number,
  category: LegacyCategory
): LegacyRow | null {
  const data = loadDataset();
  if (!data) return null;
  return data.results.find(
    (row) => row.year === year && row.month === month && row.category === category
  ) ?? null;
}

export function getLegacyMonthlyRows(year: number, month: number): LegacyRow[] {
  const data = loadDataset();
  if (!data) return [];
  return data.results.filter((row) => row.year === year && row.month === month);
}
