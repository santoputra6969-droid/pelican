import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/Icon";
import { AdminWargaReadOnlyDisplay } from "@/components/admin/AdminWargaReadOnlyDisplay";

export const dynamic = "force-dynamic";

function parseRelation(note: string | null) {
  if (!note) return "ANAK" as const;
  const match = note.match(/RELASI:([A-Z_]+)/);
  if (match?.[1] === "KERABAT") return "KERABAT" as const;
  if (match?.[1] === "SUAMI") return "SUAMI" as const;
  if (match?.[1] === "ISTRI") return "ISTRI" as const;
  return "ANAK" as const;
}

export default async function AdminWargaPengkinianPage() {
  const [houses, residents, members] = await Promise.all([
    prisma.house.findMany({
      select: { id: true, block: true, no: true, ownerName: true },
      orderBy: [{ block: "asc" }, { no: "asc" }],
    }),
    prisma.resident.findMany({
      where: { createdBy: { contains: "warga:" } },
      select: {
        houseId: true,
        name: true,
        phone: true,
        role: true,
        familyStatus: true,
        note: true,
      },
      orderBy: [{ houseId: "asc" }, { id: "asc" }],
    }),
    prisma.resident.findMany({
      where: { createdBy: { contains: ":anggota" } },
      select: {
        houseId: true,
        name: true,
        note: true,
      },
      orderBy: [{ houseId: "asc" }, { id: "asc" }],
    }),
  ]);

  // Build resident data map
  const residentDataMap = new Map<
    number,
    {
      name: string | null;
      phone: string | null;
      role: string | null;
      familyStatus: string | null;
      note: string | null;
      members: Array<{
        name: string | null;
        note: string | null;
      }>;
    }
  >();

  // Add main residents
  residents.forEach((r) => {
    residentDataMap.set(r.houseId, {
      name: r.name,
      phone: r.phone,
      role: r.role,
      familyStatus: r.familyStatus,
      note: r.note,
      members: [],
    });
  });

  // Add family members
  members.forEach((m) => {
    const data = residentDataMap.get(m.houseId);
    if (data) {
      data.members.push({
        name: m.name,
        note: m.note,
      });
    }
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-5 sm:py-6">
      <Link
        href="/admin/warga"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft transition hover:text-pelican-700"
      >
        <Icon name="arrow-left" size={16} />
        Kembali ke Data Warga
      </Link>

      <h1 className="text-2xl font-extrabold text-ink">Pengkinian Data</h1>
      <p className="mt-1 text-sm text-ink-soft">Lihat dan verifikasi data warga cluster.</p>

      <div className="mt-6">
        <AdminWargaReadOnlyDisplay
          houses={houses}
          residentDataMap={Object.fromEntries(residentDataMap)}
        />
      </div>
    </div>
  );
}

