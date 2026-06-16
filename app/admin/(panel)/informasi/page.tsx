import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InformasiManager } from "@/components/admin/InformasiManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminInformasiPage() {
  const infos = await prisma.information.findMany({
    orderBy: [{ isPin: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Informasi"
        subtitle="Kelola pengumuman & informasi untuk warga"
      />
      <InformasiManager
        items={infos.map((i) => ({
          id: i.id,
          title: i.title,
          content: i.content,
          image: i.image,
          isPin: i.isPin,
          published: i.published,
          date: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
