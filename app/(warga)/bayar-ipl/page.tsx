import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { BayarIpl } from "@/components/BayarIpl";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
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

  const [bills, paidBills] = await Promise.all([
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
  ]);

  const ownerName = house.ownerName ?? `Rumah ${house.block} No. ${house.no}`;
  const paidThisYear = new Set(
    paidBills.filter((b) => b.year === nowYear).map((b) => b.month)
  );
  const futureBills = Array.from(
    { length: Math.max(0, 12 - nowMonth) },
    (_, i) => nowMonth + i + 1
  )
    .filter((m) => !paidThisYear.has(m))
    .map((month) => ({ year: nowYear, month, amount: house.iplAmount }));

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

      <Script
        src={snapJsUrl()}
        data-client-key={getClientKey()}
        strategy="afterInteractive"
      />

      <BottomNav />
    </main>
  );
}
