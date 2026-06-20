import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TunggakanReport } from "@/components/admin/TunggakanReport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTunggakanPage({
  searchParams,
}: {
  searchParams: Promise<{ block?: string }>;
}) {
  const sp = await searchParams;
  const block = sp.block && sp.block !== "SEMUA" ? sp.block : null;
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const dueUnpaidWhere = {
    status: "UNPAID" as const,
    OR: [
      { year: { lt: nowYear } },
      { year: nowYear, month: { lte: nowMonth } },
    ],
  };

  const houses = await prisma.house.findMany({
    where: {
      ...(block ? { block } : {}),
      bills: { some: dueUnpaidWhere },
    },
    include: {
      bills: {
        where: dueUnpaidWhere,
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
    orderBy: [{ block: "asc" }, { no: "asc" }],
  });

  const blocks = await prisma.house.findMany({
    distinct: ["block"],
    select: { block: true },
    orderBy: { block: "asc" },
  });

  // Periode IPL yang telah diputihkan (write-off) → dikeluarkan dari tunggakan.
  const waivers = await prisma.feeWaiver.findMany({
    where: { feeType: "IPL" },
    select: { houseId: true, year: true, month: true },
  });
  const waivedKeys = new Set(
    waivers.map((w) => `${w.houseId}:${w.year}:${w.month}`)
  );

  const rows = houses
    .map((h) => {
      const bills = h.bills.filter(
        (b) => !waivedKeys.has(`${h.id}:${b.year}:${b.month}`)
      );
      return {
        id: h.id,
        block: h.block,
        no: h.no,
        ownerName: h.ownerName,
        months: bills.length,
        total: bills.reduce((s, b) => s + b.amount, 0),
        bills: bills.map((b) => ({ year: b.year, month: b.month, amount: b.amount })),
      };
    })
    .filter((r) => r.bills.length > 0);

  return (
    <div className="px-5 py-6 print:px-0 print:py-0 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Tunggakan IPL"
          subtitle="Daftar rumah yang menunggak iuran IPL"
        />
      </div>
      <TunggakanReport
        rows={rows}
        blocks={blocks.map((b) => b.block)}
        selectedBlock={block ?? "SEMUA"}
        totalPiutang={rows.reduce((s, r) => s + r.total, 0)}
      />
    </div>
  );
}
