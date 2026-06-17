import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BukuKasReport } from "@/components/admin/BukuKasReport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBukuKasPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; category?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  const year = Number(sp.year) || now.getFullYear();
  const month = Number(sp.month) || now.getMonth() + 1;
  const category = sp.category === "PKK" || sp.category === "UTAMA" ? sp.category : "SEMUA";

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const where = (extra: object = {}) => ({
    ...(category === "SEMUA" ? {} : { category }),
    ...extra,
  });

  const [opening, txs] = await Promise.all([
    // saldo awal = total mutasi sebelum periode
    prisma.transaction.findMany({
      where: where({ createdAt: { lt: start } }),
      select: { amount: true, mutation: true },
    }),
    prisma.transaction.findMany({
      where: where({ createdAt: { gte: start, lt: end } }),
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const saldoAwal = opening.reduce(
    (s, t) => s + (t.mutation === "DEBIT" ? t.amount : -t.amount),
    0
  );
  const totalMasuk = txs
    .filter((t) => t.mutation === "DEBIT")
    .reduce((s, t) => s + t.amount, 0);
  const totalKeluar = txs
    .filter((t) => t.mutation !== "DEBIT")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="bukukas-page px-5 py-6 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Buku Kas"
          subtitle="Laporan kas bulanan — saldo awal, pemasukan, pengeluaran"
        />
      </div>
      <BukuKasReport
        year={year}
        month={month}
        category={category}
        saldoAwal={saldoAwal}
        totalMasuk={totalMasuk}
        totalKeluar={totalKeluar}
        rows={txs.map((t) => ({
          id: t.id,
          createdAt: t.createdAt.toISOString(),
          category: t.category,
          type: t.type,
          notes: t.notes,
          amount: t.amount,
          mutation: t.mutation,
        }))}
      />
    </div>
  );
}
