import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TunggakanReport } from "@/components/admin/TunggakanReport";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSistagIplPage({
  searchParams,
}: {
  searchParams: Promise<{ block?: string }>;
}) {
  const sp = await searchParams;
  const block = sp.block && sp.block !== "SEMUA" ? sp.block : null;
  const now = new Date();
  const targetYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const houses = await prisma.house.findMany({
    where: {
      payIpl: true,
      ...(block ? { block } : {}),
    },
    select: {
      id: true,
      block: true,
      no: true,
      ownerName: true,
      iplAmount: true,
      bills: {
        where: { year: targetYear },
        select: { year: true, month: true, amount: true, status: true },
        orderBy: [{ month: "asc" }],
      },
    },
    orderBy: [{ block: "asc" }, { no: "asc" }],
  });

  const blocks = await prisma.house.findMany({
    where: { payIpl: true },
    distinct: ["block"],
    select: { block: true },
    orderBy: { block: "asc" },
  });

  const rows = houses
    .map((h) => {
      const byMonth = new Map(h.bills.map((b) => [b.month, b]));

      // Sistag = sisa tagihan tahun berjalan: cari tunggakan paling awal sampai bulan saat ini.
      let firstUnpaidMonth = 0;
      for (let month = 1; month <= nowMonth; month += 1) {
        const bill = byMonth.get(month);
        if (!bill || bill.status !== "PAID") {
          firstUnpaidMonth = month;
          break;
        }
      }

      if (!firstUnpaidMonth) return null;

      const dueBills = [] as { year: number; month: number; amount: number }[];
      for (let month = firstUnpaidMonth; month <= 12; month += 1) {
        const bill = byMonth.get(month);
        dueBills.push({
          year: targetYear,
          month,
          amount: bill?.amount ?? h.iplAmount,
        });
      }

      return {
        id: h.id,
        block: h.block,
        no: h.no,
        ownerName: h.ownerName,
        months: dueBills.length,
        total: dueBills.reduce((s, b) => s + b.amount, 0),
        bills: dueBills,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Sistag IPL"
          subtitle={`Daftar sisa tagihan IPL tahun ${targetYear} sampai Desember`}
        />
      </div>
      <TunggakanReport
        rows={rows}
        blocks={blocks.map((b) => b.block)}
        selectedBlock={block ?? "SEMUA"}
        totalPiutang={rows.reduce((s, r) => s + r.total, 0)}
        reportKind="IPL"
        reportLabel="Sistag IPL"
        filterBasePath="/admin/sistag-ipl"
      />
    </div>
  );
}
