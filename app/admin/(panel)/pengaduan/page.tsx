import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPengaduanTable } from "@/components/admin/AdminPengaduanTable";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AdminPengaduanPage() {
  const [complaints, baru, diproses, selesai] = await Promise.all([
    prisma.complaint.findMany({ orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.complaint.count({ where: { status: "BARU" } }),
    prisma.complaint.count({ where: { status: "DIPROSES" } }),
    prisma.complaint.count({ where: { status: "SELESAI" } }),
  ]);

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Pengaduan Warga"
        subtitle="Kelola keluhan & masukan dari warga"
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Icon name="chat" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">{baru}</p>
          <p className="text-xs text-ink-faint">Baru</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icon name="history" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">{diproses}</p>
          <p className="text-xs text-ink-faint">Diproses</p>
        </div>
        <div className="card p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
            <Icon name="check" size={18} />
          </span>
          <p className="mt-2 text-lg font-extrabold text-ink">{selesai}</p>
          <p className="text-xs text-ink-faint">Selesai</p>
        </div>
      </div>

      <AdminPengaduanTable
        complaints={complaints.map((c) => ({
          id: c.id,
          houseLabel: c.houseLabel,
          ownerName: c.ownerName,
          category: c.category,
          message: c.message,
          status: c.status,
          reply: c.reply,
          repliedBy: c.repliedBy,
          date: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
