import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { PemutihanManager } from "@/components/admin/PemutihanManager";
import { getCommunityFeeRows } from "@/lib/communityFees";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPemutihanPage() {
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

  const [iplHouses, kas, pkk, waivers, allHouses] = await Promise.all([
    prisma.house.findMany({
      where: { bills: { some: dueUnpaidWhere } },
      include: {
        bills: {
          where: dueUnpaidWhere,
          orderBy: [{ year: "asc" }, { month: "asc" }],
        },
      },
      orderBy: [{ block: "asc" }, { no: "asc" }],
    }),
    getCommunityFeeRows({ feeType: "KAS", selectedBlock: "SEMUA", includeAllYears: true }),
    getCommunityFeeRows({ feeType: "PKK", selectedBlock: "SEMUA", includeAllYears: true }),
    prisma.feeWaiver.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.house.findMany({
      select: { id: true, block: true, no: true, ownerName: true },
    }),
  ]);

  // Kecualikan periode IPL yang sudah diputihkan dari daftar yang bisa dipilih.
  const waivedIpl = new Set(
    waivers
      .filter((w) => w.feeType === "IPL")
      .map((w) => `${w.houseId}:${w.year}:${w.month}`)
  );

  const iplRows = iplHouses
    .map((h) => {
      const bills = h.bills.filter(
        (b) => !waivedIpl.has(`${h.id}:${b.year}:${b.month}`)
      );
      return {
        id: h.id,
        block: h.block,
        no: h.no,
        ownerName: h.ownerName,
        bills: bills.map((b) => ({ year: b.year, month: b.month, amount: b.amount })),
      };
    })
    .filter((r) => r.bills.length > 0);

  const houseById = new Map(allHouses.map((h) => [h.id, h]));
  const waiverRows = waivers.map((w) => {
    const house = houseById.get(w.houseId);
    return {
      id: w.id,
      feeType: w.feeType,
      houseId: w.houseId,
      block: house?.block ?? "?",
      no: house?.no ?? "?",
      ownerName: house?.ownerName ?? null,
      year: w.year,
      month: w.month,
      amount: w.amount,
      reason: w.reason,
      waivedBy: w.waivedBy,
      createdAt: w.createdAt.toISOString(),
    };
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Pemutihan Tagihan"
        subtitle="Putihkan tunggakan yang sudah dibayar di luar sistem (mis. ke developer sebelum serah terima)"
      />
      <PemutihanManager
        iplRows={iplRows}
        kasRows={kas.rows.map((r) => ({
          id: r.id,
          block: r.block,
          no: r.no,
          ownerName: r.ownerName,
          bills: r.bills,
        }))}
        pkkRows={pkk.rows.map((r) => ({
          id: r.id,
          block: r.block,
          no: r.no,
          ownerName: r.ownerName,
          bills: r.bills,
        }))}
        waivers={waiverRows}
      />
    </div>
  );
}
