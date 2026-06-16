import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ArsipManager } from "@/components/admin/ArsipManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminArsipPage() {
  const archives = await prisma.archive.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Kelola Arsip"
        subtitle="Arsip dokumen: laporan keuangan, notulen, SK, dll"
      />
      <ArsipManager
        archives={archives.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          fileId: a.fileId,
          createdAt: a.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
