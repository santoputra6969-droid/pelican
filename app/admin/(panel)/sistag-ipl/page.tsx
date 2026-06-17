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

  const rows = houses.map((h) => ({
    id: h.id,
    block: h.block,
    no: h.no,
    ownerName: h.ownerName,
    months: h.bills.length,
    total: h.bills.reduce((s, b) => s + b.amount, 0),
    bills: h.bills.map((b) => ({ year: b.year, month: b.month, amount: b.amount })),
  }));

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Sistag IPL"
          subtitle="Daftar penagihan IPL aktif berdasarkan tunggakan"
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
