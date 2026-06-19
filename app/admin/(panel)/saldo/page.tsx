import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTransaksiTable } from "@/components/admin/AdminTransaksiTable";
import { AddTransaksiForm } from "@/components/admin/AddTransaksiForm";
import { PendingSaldoReview } from "@/components/admin/PendingSaldoReview";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AdminSaldoPage() {
  const [transactions, pendingPaymentsRaw, houses, balance, masukUtama, keluarUtama, masukPkk, keluarPkk] =
    await Promise.all([
      prisma.transaction.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.payment.findMany({
        where: { status: "REVIEW" },
        orderBy: { settledAt: "desc" },
        take: 100,
        select: {
          id: true,
          orderId: true,
          amount: true,
          paymentType: true,
          settledAt: true,
          houseId: true,
        },
      }),
      prisma.house.findMany({
        select: { id: true, block: true, no: true, ownerName: true },
      }),
      prisma.balance.findFirst({ orderBy: { id: "asc" } }),
      prisma.transaction.aggregate({
        where: { category: "UTAMA", mutation: "DEBIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { category: "UTAMA", mutation: "KREDIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { category: "PKK", mutation: "DEBIT" },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { category: "PKK", mutation: "KREDIT" },
        _sum: { amount: true },
      }),
    ]);

  const houseMap = new Map(houses.map((house) => [house.id, house]));
  const pendingPayments = pendingPaymentsRaw.map((payment) => ({
    ...payment,
    settledAt: payment.settledAt ? payment.settledAt.toISOString() : null,
    house: payment.houseId ? houseMap.get(payment.houseId) ?? null : null,
  }));

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Kelola Saldo"
        subtitle="Ringkasan saldo kas utama, kas PKK, dan mutasi terbaru"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <PendingSaldoReview payments={pendingPayments} />
            <AddTransaksiForm />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
            <Icon name="wallet" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">{formatRupiah(balance?.balance ?? 0)}</p>
          <p className="text-xs text-ink-faint">Saldo kas utama</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Icon name="shield" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">{formatRupiah(balance?.balancePkk ?? 0)}</p>
          <p className="text-xs text-ink-faint">Saldo kas PKK</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Mutasi kas utama</p>
          <p className="mt-2 text-sm font-semibold text-ink">Masuk {formatRupiah(masukUtama._sum.amount ?? 0)}</p>
          <p className="text-sm font-semibold text-ink">Keluar {formatRupiah(keluarUtama._sum.amount ?? 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Mutasi kas PKK</p>
          <p className="mt-2 text-sm font-semibold text-ink">Masuk {formatRupiah(masukPkk._sum.amount ?? 0)}</p>
          <p className="text-sm font-semibold text-ink">Keluar {formatRupiah(keluarPkk._sum.amount ?? 0)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Saldo pending review</p>
          <p className="mt-2 text-lg font-extrabold text-ink">
            {formatRupiah(pendingPayments.reduce((total, payment) => total + payment.amount, 0))}
          </p>
          <p className="text-xs text-ink-faint">{pendingPayments.length} transaksi menunggu konfirmasi</p>
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
          image: t.image,
          date: t.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
