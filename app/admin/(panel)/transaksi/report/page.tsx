import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TransaksiJournalReport } from "@/components/admin/TransaksiJournalReport";
import { MONTHS } from "@/lib/format";
import { getLegacyMonthlyRow, getLegacyMonthlyRows } from "@/lib/legacyMonthlyReport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = {
  year?: string;
  month?: string;
  category?: string;
};

export default async function AdminTransaksiReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const yearRaw = Number(sp.year ?? now.getFullYear());
  const monthRaw = Number(sp.month ?? now.getMonth() + 1);

  const year = Number.isInteger(yearRaw) && yearRaw >= 2020 && yearRaw <= 2100 ? yearRaw : now.getFullYear();
  const month = Number.isInteger(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;
  const category = sp.category === "UTAMA" || sp.category === "PKK" ? sp.category : "SEMUA";

  const fromDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const toDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const where = {
    createdAt: { gte: fromDate, lte: toDate },
    ...(category !== "SEMUA" ? { category } : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      category: true,
      mutation: true,
      amount: true,
      type: true,
      notes: true,
      createdAt: true,
    },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyMap = new Map<number, { masuk: number; keluar: number }>();
  for (let day = 1; day <= daysInMonth; day += 1) {
    dailyMap.set(day, { masuk: 0, keluar: 0 });
  }

  const categoryMap = new Map<string, { count: number; masuk: number; keluar: number }>();
  let totalMasuk = 0;
  let totalKeluar = 0;

  for (const row of transactions) {
    const day = Number(
      new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(row.createdAt)
    );
    const bucket = dailyMap.get(day);
    const byCategory = categoryMap.get(row.category) ?? { count: 0, masuk: 0, keluar: 0 };
    byCategory.count += 1;

    if (row.mutation === "DEBIT") {
      totalMasuk += row.amount;
      byCategory.masuk += row.amount;
      if (bucket) bucket.masuk += row.amount;
    } else {
      totalKeluar += row.amount;
      byCategory.keluar += row.amount;
      if (bucket) bucket.keluar += row.amount;
    }

    categoryMap.set(row.category, byCategory);
  }

  const daily = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const data = dailyMap.get(day) ?? { masuk: 0, keluar: 0 };
    return {
      day,
      label: `${String(day).padStart(2, "0")} ${MONTHS[month - 1].slice(0, 3)}`,
      masuk: data.masuk,
      keluar: data.keluar,
    };
  });

  const categorySummary = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      count: value.count,
      masuk: value.masuk,
      keluar: value.keluar,
      net: value.masuk - value.keluar,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const legacySelected = getLegacyMonthlyRow(year, month, category);
  const legacyRowsThisMonth = getLegacyMonthlyRows(year, month);

  const effectiveMasuk = legacySelected?.masuk ?? totalMasuk;
  const effectiveKeluar = legacySelected?.keluar ?? totalKeluar;

  const effectiveCategorySummary =
    category === "SEMUA" && legacyRowsThisMonth.length > 0
      ? categorySummary.map((row) => {
          const legacy = legacyRowsThisMonth.find((legacyRow) => legacyRow.category === row.name);
          if (!legacy) return row;
          return {
            ...row,
            masuk: legacy.masuk,
            keluar: legacy.keluar,
            net: legacy.masuk - legacy.keluar,
          };
        })
      : categorySummary;

  const avgMasuk = transactions.length > 0 ? Math.round(effectiveMasuk / transactions.length) : 0;
  const avgKeluar = transactions.length > 0 ? Math.round(effectiveKeluar / transactions.length) : 0;

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Laporan Transaksi"
        subtitle="Ringkasan jurnal kas bulanan dengan grafik pemasukan dan pengeluaran"
      />

      <TransaksiJournalReport
        year={year}
        month={month}
        category={category}
        daily={daily}
        totalMasuk={effectiveMasuk}
        totalKeluar={effectiveKeluar}
        totalCount={transactions.length}
        avgMasuk={avgMasuk}
        avgKeluar={avgKeluar}
        categorySummary={effectiveCategorySummary}
      />
    </div>
  );
}