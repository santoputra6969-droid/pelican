import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { IplTakeoverManager } from "@/components/admin/IplTakeoverManager";
import { prisma } from "@/lib/prisma";
import { getAllTakeovers } from "@/lib/iplTakeover";

export const dynamic = "force-dynamic";

export default async function AdminIplTakeoverPage() {
  const [rows, houses] = await Promise.all([
    getAllTakeovers(),
    prisma.house.findMany({
      select: { id: true, block: true, no: true, ownerName: true },
    }),
  ]);

  const houseIds = rows.map((r) => r.houseId);
  const payments =
    houseIds.length > 0
      ? await prisma.iplTakeoverPayment.findMany({
          where: { houseId: { in: houseIds } },
          orderBy: { createdAt: "desc" },
        })
      : [];

  const history: Record<number, {
    id: number;
    amount: number;
    source: string;
    status: string;
    note: string | null;
    createdBy: string | null;
    createdAt: string;
  }[]> = {};
  for (const p of payments) {
    (history[p.houseId] ??= []).push({
      id: p.id,
      amount: p.amount,
      source: p.source,
      status: p.status,
      note: p.note,
      createdBy: p.createdBy,
      createdAt: p.createdAt.toISOString(),
    });
  }

  const sortedHouses = [...houses].sort((a, b) => {
    const blockCmp = a.block.localeCompare(b.block, undefined, { numeric: true });
    if (blockCmp !== 0) return blockCmp;
    return (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0);
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="IPL Takeover"
        subtitle="Tunggakan IPL lama (sebelum 2025) sebelum serah terima developer ke RT/RW"
      />
      <IplTakeoverManager
        rows={rows}
        houses={sortedHouses}
        history={history}
      />
    </div>
  );
}
