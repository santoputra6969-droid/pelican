import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

type LegacyRow = {
  year: number;
  month: number;
  monthLabel: string;
  category: "SEMUA" | "UTAMA" | "PKK";
  masuk: number;
  keluar: number;
};

const prisma = new PrismaClient();
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  const legacyData = JSON.parse(
    readFileSync(join(ROOT, "prisma", "scraped", "journal_report_monthly.json"), "utf8")
  ) as { results: LegacyRow[] };

  const diffs: Array<{
    period: string;
    category: string;
    legacyMasuk: number;
    localMasuk: number;
    diffMasuk: number;
    legacyKeluar: number;
    localKeluar: number;
    diffKeluar: number;
  }> = [];

  for (const row of legacyData.results) {
    const from = new Date(Date.UTC(row.year, row.month - 1, 1, 0, 0, 0, 0));
    const to = new Date(Date.UTC(row.year, row.month, 0, 23, 59, 59, 999));

    const where = {
      createdAt: { gte: from, lte: to },
      ...(row.category === "SEMUA" ? {} : { category: row.category }),
    };

    const [masuk, keluar] = await Promise.all([
      prisma.transaction.aggregate({ where: { ...where, mutation: "DEBIT" }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { ...where, mutation: "KREDIT" }, _sum: { amount: true } }),
    ]);

    const localMasuk = masuk._sum.amount ?? 0;
    const localKeluar = keluar._sum.amount ?? 0;
    const diffMasuk = Math.round((localMasuk - row.masuk) * 100) / 100;
    const diffKeluar = Math.round((localKeluar - row.keluar) * 100) / 100;

    if (Math.abs(diffMasuk) > 0.01 || Math.abs(diffKeluar) > 0.01) {
      diffs.push({
        period: `${row.year}-${String(row.month).padStart(2, "0")}`,
        category: row.category,
        legacyMasuk: row.masuk,
        localMasuk,
        diffMasuk,
        legacyKeluar: row.keluar,
        localKeluar,
        diffKeluar,
      });
    }
  }

  console.log(`legacy rows: ${legacyData.results.length}`);
  console.log(`mismatch rows: ${diffs.length}`);
  console.log(JSON.stringify(diffs.slice(0, 25), null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
