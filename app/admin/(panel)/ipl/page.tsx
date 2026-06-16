import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { IplManager } from "@/components/admin/IplManager";
import { IplPerHouseManager } from "@/components/admin/IplPerHouseManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminIplPage() {
  const [houseCount, payIplCount, sampleHouse, recentBills, houses] =
    await Promise.all([
      prisma.house.count(),
      prisma.house.count({ where: { payIpl: true } }),
      prisma.house.findFirst({ where: { payIpl: true }, orderBy: { id: "asc" } }),
      prisma.bill.groupBy({
        by: ["year", "month"],
        _count: { _all: true },
        _sum: { amount: true },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 6,
      }),
      prisma.house.findMany({
        select: { id: true, block: true, no: true, iplAmount: true, payIpl: true },
      }),
    ]);

  const paidByPeriod = await prisma.bill.groupBy({
    by: ["year", "month"],
    where: { status: "PAID" },
    _count: { _all: true },
  });
  const paidMap = new Map(
    paidByPeriod.map((p) => [`${p.year}-${p.month}`, p._count._all])
  );

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Iuran IPL"
        subtitle="Atur nominal iuran & terbitkan tagihan bulanan"
      />
      <IplManager
        iplAmount={sampleHouse?.iplAmount ?? 252000}
        houseCount={houseCount}
        payIplCount={payIplCount}
        periods={recentBills.map((b) => ({
          year: b.year,
          month: b.month,
          count: b._count._all,
          paid: paidMap.get(`${b.year}-${b.month}`) ?? 0,
          total: b._sum.amount ?? 0,
        }))}
      />

      <div className="mt-6">
        <IplPerHouseManager houses={houses} />
      </div>
    </div>
  );
}
