import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BukuKasReport } from "@/components/admin/BukuKasReport";
import { getLegacyBukuKasRow } from "@/lib/legacyBukuKasMonthly";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const IPL_PERIOD_RE = /untuk bulan\s+(\d{1,2})\s+dan tahun\s+(\d{4})/i;

function iplForPeriodIndex(notes: string | null): number | null {
  if (!notes) return null;
  const m = notes.match(IPL_PERIOD_RE);
  if (!m) return null;
  return Number(m[2]) * 12 + Number(m[1]);
}

export default async function AdminBukuKasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const txs = await prisma.transaction.findMany({
    where: { status: "POSTED", createdAt: { gte: start, lt: end } },
    orderBy: { createdAt: "asc" },
  });

  // Buku Kas hanya mencatat pemasukan IPL yang dibayar TEPAT WAKTU atau DULUAN.
  // Pembayaran IPL yang TELAT (untuk bulan yang sudah lewat) dikecualikan dari
  // buku kas (tetap tercatat penuh di Laporan Keuangan). Aturan ini khusus IPL;
  // KAS, PKK, dan semua pengeluaran tetap dicatat berdasarkan tanggal transaksi.
  const currentIdx = year * 12 + month;
  const filteredTxs = txs.filter((t) => {
    if ((t.type ?? "").trim().toUpperCase() !== "IPL") return true;
    const forIdx = iplForPeriodIndex(t.notes);
    if (forIdx === null) return true; // entri IPL manual tanpa periode → tetap dihitung
    return forIdx >= currentIdx; // tepat waktu / duluan → masuk; telat → dikecualikan
  });

  const totalMasuk = filteredTxs
    .filter((t) => t.mutation === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);
  const totalKeluar = filteredTxs
    .filter((t) => t.mutation !== "DEBIT")
    .reduce((s, t) => s + t.amount, 0);

  const legacyBukuKas = getLegacyBukuKasRow(year, month);

  return (
    <div className="bukukas-page px-5 py-6 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Buku Kas"
          subtitle="Pemasukan IPL tepat waktu/duluan vs pengeluaran — surplus atau minus bulan ini"
        />
      </div>
      <BukuKasReport
        year={year}
        month={month}
        totalMasuk={totalMasuk}
        totalKeluar={totalKeluar}
        legacyBukuKas={legacyBukuKas}
        rows={filteredTxs.map((t) => ({
          id: t.id,
          createdAt: t.createdAt.toISOString(),
          category: t.category,
          type: t.type,
          idSettlement: t.idSettlement,
          notes: t.notes,
          amount: t.amount,
          mutation: t.mutation,
        }))}
      />
    </div>
  );
}
