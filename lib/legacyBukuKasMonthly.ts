import { readFileSync } from "node:fs";
import { join } from "node:path";

const MONTH_LABEL_TO_NUMBER: Record<string, number> = {
  JANUARY: 1,
  FEBRUARY: 2,
  MARCH: 3,
  APRIL: 4,
  MAY: 5,
  JUNE: 6,
  JULY: 7,
  AUGUST: 8,
  SEPTEMBER: 9,
  OCTOBER: 10,
  NOVEMBER: 11,
  DECEMBER: 12,
};

type LegacyBukuKasRowRaw = {
  year: number;
  month: number;
  monthLabel: string;
  ipl: { count: number; amount: number; fee: number };
  kas: { count: number; amount: number; fee: number };
  pkk: { count: number; amount: number; fee: number };
  lainnya: { count: number; masuk: number; keluar: number };
  totals: {
    masuk: number;
    masukUtama: number;
    masukPkk: number;
    keluar: number;
    keluarUtama: number;
    keluarPkk: number;
    net: number;
    netUtama: number;
    netPkk: number;
  };
};

export type LegacyBukuKasRow = {
  year: number;
  month: number;
  monthLabel: string;
  ipl: { count: number; amount: number; fee: number };
  kas: { count: number; amount: number; fee: number };
  pkk: { count: number; amount: number; fee: number };
  lainnya: { count: number; masuk: number; keluar: number };
  totals: {
    masuk: number;
    masukUtama: number;
    masukPkk: number;
    keluar: number;
    keluarUtama: number;
    keluarPkk: number;
    net: number;
    netUtama: number;
    netPkk: number;
  };
};

type LegacyBukuKasDataset = {
  years: string[];
  count: number;
  results: LegacyBukuKasRowRaw[];
};

let cache: LegacyBukuKasRow[] | null = null;

function normalizeRows(rows: LegacyBukuKasRowRaw[]): LegacyBukuKasRow[] {
  return rows.map((row) => {
    const monthByLabel = MONTH_LABEL_TO_NUMBER[String(row.monthLabel ?? "").toUpperCase()];
    const month = monthByLabel ?? row.month;

    const masuk = row.totals.masuk ?? 0;
    const keluar = row.totals.keluar ?? 0;
    const masukUtama = row.totals.masukUtama ?? 0;
    const masukPkk = row.totals.masukPkk ?? 0;
    const keluarUtama = row.totals.keluarUtama ?? 0;
    const keluarPkk = row.totals.keluarPkk ?? 0;

    return {
      ...row,
      month,
      kas: {
        count: row.kas.count ?? 0,
        amount: row.kas.amount ?? 0,
        fee: row.kas.count > 0 ? row.kas.fee ?? 0 : 0,
      },
      pkk: {
        count: row.pkk.count ?? 0,
        amount: row.pkk.amount ?? 0,
        fee: row.pkk.count > 0 ? row.pkk.fee ?? 0 : 0,
      },
      totals: {
        masuk,
        keluar,
        masukUtama,
        masukPkk,
        keluarUtama,
        keluarPkk,
        net: masuk - keluar,
        netUtama: masukUtama - keluarUtama,
        netPkk: masukPkk - keluarPkk,
      },
    };
  });
}

function loadRows(): LegacyBukuKasRow[] {
  if (cache) return cache;
  try {
    const file = join(process.cwd(), "prisma", "scraped", "bukukas_monthly.json");
    const data = JSON.parse(readFileSync(file, "utf8")) as LegacyBukuKasDataset;
    cache = normalizeRows(data.results ?? []);
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

export function getLegacyBukuKasRow(year: number, month: number): LegacyBukuKasRow | null {
  const rows = loadRows();
  return rows.find((row) => row.year === year && row.month === month) ?? null;
}
