import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ResidentManager } from "@/components/admin/ResidentManager";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminWargaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const houseId = Number(id);
  if (!Number.isFinite(houseId)) notFound();

  const house = await prisma.house.findUnique({
    where: { id: houseId },
    include: { residents: { orderBy: [{ role: "asc" }, { id: "asc" }] } },
  });
  if (!house) notFound();

  const status = !house.occupied
    ? "Kosong"
    : house.occupiedByOwner
      ? "Ditempati Pemilik"
      : "Ditempati Pengontrak";

  return (
    <div className="px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
      <Link
        href="/admin/warga"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-pelican-700"
      >
        <Icon name="arrow-left" size={16} />
        Kembali ke Data Warga
      </Link>

      <AdminPageHeader
        title={`Rumah ${house.block} No. ${house.no}`}
        subtitle="Detail hunian, data pemilik & penghuni"
      />

      <div className="card mb-6 grid gap-4 p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-ink-faint">Info Rumah</p>
          <p className="font-semibold text-ink">
            {house.block} No. {house.no}
          </p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Status Rumah</p>
          <p className="font-semibold text-ink">{status}</p>
        </div>
        <div>
          <p className="text-xs text-ink-faint">Iuran IPL / bulan</p>
          <p className="font-semibold text-ink">
            {house.payIpl ? formatRupiah(house.iplAmount) : "—"}
          </p>
        </div>
      </div>

      <ResidentManager
        houseId={house.id}
        residents={house.residents.map((r) => ({
          id: r.id,
          role: r.role,
          name: r.name,
          phone: r.phone,
          nik: r.nik,
          familyStatus: r.familyStatus,
          active: r.active,
          note: r.note,
          ktpFileId: r.ktpFileId,
          kkFileId: r.kkFileId,
        }))}
      />
    </div>
  );
}
