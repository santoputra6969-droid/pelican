import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTransaksiTable } from "@/components/admin/AdminTransaksiTable";
import { AddTransaksiForm } from "@/components/admin/AddTransaksiForm";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminTransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    category?: string;
    mutation?: string;
  }>;
}) {
  const sp = await searchParams;
  const today = new Date();
  const toDefault = today.toISOString().slice(0, 10);
  const fromDefault = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const from = /^\d{4}-\d{2}-\d{2}$/.test(sp.from ?? "") ? (sp.from as string) : fromDefault;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? (sp.to as string) : toDefault;
  const category = sp.category === "UTAMA" || sp.category === "PKK" ? sp.category : "SEMUA";
  const mutation = sp.mutation === "DEBIT" || sp.mutation === "KREDIT" ? sp.mutation : "SEMUA";

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  const where = {
    status: "POSTED",
    createdAt: { gte: fromDate, lte: toDate },
    ...(category !== "SEMUA" ? { category } : {}),
    ...(mutation !== "SEMUA" ? { mutation } : {}),
  };

  const [transactions, masuk, keluar, balance] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.transaction.aggregate({
      where: { mutation: "DEBIT" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { mutation: "KREDIT" },
      _sum: { amount: true },
    }),
    prisma.balance.findFirst({ orderBy: { id: "asc" } }),
  ]);

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Jurnal Kas"
        subtitle="Seluruh transaksi pemasukan & pengeluaran cluster"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href="/admin/transaksi/report" className="btn-ghost w-full sm:w-auto">
              <Icon name="history" size={18} />
              Laporan Bulanan
            </Link>
            <AddTransaksiForm />
          </div>
        }
      />

      <form method="GET" className="card mb-4 space-y-3 p-4 print:hidden">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Mulai Transaksi</label>
            <input type="date" name="from" defaultValue={from} className="input" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Akhir Transaksi</label>
            <input type="date" name="to" defaultValue={to} className="input" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Kategori</label>
            <select name="category" defaultValue={category} className="input">
              <option value="SEMUA">SEMUA</option>
              <option value="UTAMA">UTAMA</option>
              <option value="PKK">PKK</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Mutasi</label>
            <select name="mutation" defaultValue={mutation} className="input">
              <option value="SEMUA">SEMUA</option>
              <option value="DEBIT">DEBIT</option>
              <option value="KREDIT">KREDIT</option>
            </select>
          </div>
        </div>
        <button type="submit" className="w-full rounded-lg bg-[#726d70] px-4 py-2 text-sm font-semibold text-white">
          FILTER
        </button>
      </form>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
            <Icon name="wallet" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(balance?.balance ?? 0)}
          </p>
          <p className="text-xs text-ink-faint">Saldo kas</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
            <Icon name="arrow-right" size={18} className="rotate-90" />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(masuk._sum.amount ?? 0)}
          </p>
          <p className="text-xs text-ink-faint">Total pemasukan</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
            <Icon name="arrow-right" size={18} className="-rotate-90" />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(keluar._sum.amount ?? 0)}
          </p>
          <p className="text-xs text-ink-faint">Total pengeluaran</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Icon name="shield" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(balance?.balancePkk ?? 0)}
          </p>
          <p className="text-xs text-ink-faint">Kas PKK</p>
        </div>
      </div>

      <AdminTransaksiTable
        title="Daftar Transaksi"
        subtitle={`Periode ${from} s.d. ${to}`}
        transactions={transactions.map((t) => ({
          id: t.id,
          category: t.category,
          type: t.type,
          notes: t.notes,
          amount: t.amount,
          mutation: t.mutation,
          createdBy: t.createdBy,
          image: t.image,
          date: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
