import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { BayarIpl } from "@/components/BayarIpl";
import { IplTakeoverCard } from "@/components/IplTakeoverCard";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { getTakeoverForHouse } from "@/lib/iplTakeover";
import { snapJsUrl, getClientKey } from "@/lib/midtrans";
import Script from "next/script";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function BayarIplPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const [bills, paidBills, futureUnpaidBills] = await Promise.all([
    prisma.bill.findMany({
      where: {
        houseId: house.id,
        status: "UNPAID",
        OR: [
          { year: { lt: nowYear } },
          { year: nowYear, month: { lte: nowMonth } },
        ],
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.bill.findMany({
      where: { houseId: house.id, status: "PAID" },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.bill.findMany({
      where: {
        houseId: house.id,
        status: "UNPAID",
        year: nowYear,
        month: { gt: nowMonth },
      },
      select: { month: true, amount: true },
    }),
  ]);

  const ownerName = house.ownerName ?? `Rumah ${house.block} No. ${house.no}`;
  const takeover = await getTakeoverForHouse(house.id);
  const paidThisYear = new Set(
    paidBills.filter((b) => b.year === nowYear).map((b) => b.month)
  );
  const futureUnpaidMap = new Map(futureUnpaidBills.map((b) => [b.month, b.amount]));
  const futureBills = Array.from(
    { length: Math.max(0, 12 - nowMonth) },
    (_, i) => nowMonth + i + 1
  )
    .filter((m) => !paidThisYear.has(m))
    .map((month) => ({
      year: nowYear,
      month,
      amount: futureUnpaidMap.get(month) ?? house.iplAmount,
    }));

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Bayar IPL" subtitle={`Blok ${house.block} / No. ${house.no}`} />

      {/* Property info */}
      <section className="-mt-2 px-5">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
            <Icon name="home" size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{ownerName}</p>
            <p className="text-xs text-ink-faint">
              Blok {house.block} / No. {house.no}
            </p>
          </div>
          <span className="chip">{house.occupied ? "Dihuni" : "Kosong"}</span>
        </div>
      </section>

      <BayarIpl
        bills={bills.map((b) => ({
          id: b.id,
          year: b.year,
          month: b.month,
          amount: b.amount,
        }))}
        paidBills={paidBills.map((b) => ({
          id: b.id,
          year: b.year,
          month: b.month,
          amount: b.amount,
        }))}
        futureBills={futureBills}
      />

      {takeover && takeover.totalAmount > 0 && (
        <IplTakeoverCard
          total={takeover.totalAmount}
          paid={takeover.paid}
          pending={takeover.pending}
          remaining={takeover.remaining}
        />
      )}

      <Script
        src={snapJsUrl()}
        data-client-key={getClientKey()}
        strategy="afterInteractive"
      />

      <BottomNav />
    </main>
  );
}
