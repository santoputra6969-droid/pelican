import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTransaksiTable } from "@/components/admin/AdminTransaksiTable";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AdminTransaksiPage() {
  const [transactions, masuk, keluar, balance] = await Promise.all([
    prisma.transaction.findMany({
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
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        transactions={transactions.map((t) => ({
          id: t.id,
          category: t.category,
          type: t.type,
          notes: t.notes,
          amount: t.amount,
          mutation: t.mutation,
          createdBy: t.createdBy,
          date: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
