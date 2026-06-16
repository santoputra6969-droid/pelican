import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BannerManager } from "@/components/admin/BannerManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBannerPage() {
  const banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Banner"
        subtitle="Kelola banner promosi di beranda warga"
      />
      <BannerManager
        items={banners.map((b) => ({
          id: b.id,
          image: b.image,
          active: b.active,
        }))}
      />
    </div>
  );
}
