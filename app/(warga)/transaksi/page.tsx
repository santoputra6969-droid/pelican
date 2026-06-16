import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { TransaksiList } from "@/components/TransaksiList";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransaksiPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const [transactions, balance] = await Promise.all([
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.balance.findFirst({ orderBy: { id: "asc" } }),
  ]);

  return (
    <main className="flex min-h-screen flex-col pb-24">
      <PageHeader title="Daftar Transaksi" subtitle="Jurnal kas cluster" />

      <section className="-mt-2 px-5">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-ink-soft">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
                <Icon name="wallet" size={18} />
              </span>
              <span className="text-xs font-semibold">Saldo Kas Cluster</span>
            </div>
            <p className="text-base font-extrabold text-ink">
              {formatRupiah(balance?.balance ?? 0)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
            <div className="flex items-center gap-2 text-ink-soft">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Icon name="shield" size={18} />
              </span>
              <span className="text-xs font-semibold">Saldo Kas PKK</span>
            </div>
            <p className="text-base font-extrabold text-ink">
              {formatRupiah(balance?.balancePkk ?? 0)}
            </p>
          </div>
          {balance?.updatedBy && (
            <p className="mt-3 text-[11px] text-ink-faint">
              Diupdate oleh: {balance.updatedBy} · Terakhir update:{" "}
              {formatDateTime(balance.updatedAt.toISOString())}
            </p>
          )}
        </div>
      </section>

      <TransaksiList
        transactions={transactions.map((t) => ({
          id: t.id,
          category: t.category,
          type: t.type,
          notes: t.notes,
          amount: t.amount,
          mutation: t.mutation,
          createdBy: t.createdBy,
          idSettlement: t.idSettlement,
          image: t.image,
          date: t.createdAt.toISOString(),
        }))}
      />

      <BottomNav />
    </main>
  );
}
