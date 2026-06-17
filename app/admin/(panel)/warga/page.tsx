import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { WargaManager } from "@/components/admin/WargaManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminWargaPage() {
  const houses = await prisma.house.findMany({
    orderBy: [{ block: "asc" }, { no: "asc" }],
    include: {
      _count: { select: { bills: { where: { status: "UNPAID" } } } },
    },
  });

  return (
    <div className="px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
      <AdminPageHeader
        title="Data Warga"
        subtitle="Kelola data hunian & pemilik rumah"
      />
      <WargaManager
        houses={houses.map((h) => ({
          id: h.id,
          block: h.block,
          no: h.no,
          ownerName: h.ownerName,
          occupied: h.occupied,
          occupiedByOwner: h.occupiedByOwner,
          payIpl: h.payIpl,
          iplAmount: h.iplAmount,
          unpaid: h._count.bills,
        }))}
      />
    </div>
  );
}
