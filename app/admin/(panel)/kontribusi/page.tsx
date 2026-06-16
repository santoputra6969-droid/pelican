import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { KontribusiManager } from "@/components/admin/KontribusiManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminKontribusiPage() {
  const contributions = await prisma.contribution.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      entries: { orderBy: { createdAt: "desc" } },
    },
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Kelola Kontribusi"
        subtitle="Iuran / sumbangan khusus warga"
      />
      <KontribusiManager
        contributions={contributions.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          target: c.target,
          active: c.active,
          collected: c.entries.reduce((s, e) => s + e.amount, 0),
          entries: c.entries.map((e) => ({
            id: e.id,
            donorName: e.donorName,
            amount: e.amount,
            note: e.note,
            createdAt: e.createdAt.toISOString(),
          })),
        }))}
      />
    </div>
  );
}
