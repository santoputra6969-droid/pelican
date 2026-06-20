import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/Icon";
import { AdminResidentLegacyForm } from "@/components/admin/AdminResidentLegacyForm";

export const dynamic = "force-dynamic";

export default async function AdminWargaPengkinianPage() {
  const houses = await prisma.house.findMany({
    select: { id: true, block: true, no: true, ownerName: true },
    orderBy: [{ block: "asc" }, { no: "asc" }],
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-5 sm:py-6">
      <Link
        href="/admin/warga"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-pelican-700"
      >
        <Icon name="arrow-left" size={16} />
        Kembali ke Data Warga
      </Link>

      <h1 className="text-2xl font-extrabold text-ink">Pengkinian Data</h1>
      <p className="mt-1 text-sm text-ink-soft">Ikuti format form lama untuk pendataan warga.</p>

      <div className="mt-4">
        <AdminResidentLegacyForm houses={houses} />
      </div>
    </div>
  );
}

