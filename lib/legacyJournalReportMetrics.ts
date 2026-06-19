import { readFileSync } from "node:fs";
import { join } from "node:path";

type LegacyCategory = "SEMUA" | "UTAMA" | "PKK";

type LegacyCategorySummary = {
  name: string;
  count: number;
  masuk: number;
  keluar: number;
};

type LegacyMetricsRow = {
  year: number;
  month: number;
  category: LegacyCategory;
  totalCount: number;
  countMasuk: number;
  countKeluar: number;
  avgMasuk: number;
  avgKeluar: number;
  categorySummary: LegacyCategorySummary[];
};

type LegacyMetricsDataset = {
  count: number;
  results: LegacyMetricsRow[];
};

let cache: LegacyMetricsDataset | null = null;

function loadDataset(): LegacyMetricsDataset | null {
  if (cache) return cache;
  try {
    const file = join(process.cwd(), "prisma", "scraped", "journal_report_metrics.json");
    cache = JSON.parse(readFileSync(file, "utf8")) as LegacyMetricsDataset;
    return cache;
  } catch {
    return null;
  }
}

export function getLegacyJournalReportMetrics(
  year: number,
  month: number,
  category: LegacyCategory
): LegacyMetricsRow | null {
  const data = loadDataset();
  if (!data) return null;
  return data.results.find(
    (row) => row.year === year && row.month === month && row.category === category
  ) ?? null;
}
