import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { ResidentReadOnly } from "@/components/ResidentReadOnly";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";

export const dynamic = "force-dynamic";

function parseRelation(note: string | null) {
  if (!note) return "ANAK" as const;
  const match = note.match(/RELASI:([A-Z_]+)/);
  if (match?.[1] === "KERABAT") return "KERABAT" as const;
  if (match?.[1] === "SUAMI") return "SUAMI" as const;
  if (match?.[1] === "ISTRI") return "ISTRI" as const;
  return "ANAK" as const;
}

function parseReligion(note: string | null) {
  if (!note) return "";
  const match = note.match(/AGAMA:([A-Z]+)/);
  return match?.[1] ?? "";
}

export default async function ResidentFormPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const [existing, members] = await Promise.all([
    prisma.resident.findFirst({
      where: { houseId: house.id, createdBy: `warga:${house.id}` },
      orderBy: { id: "asc" },
      select: {
        name: true,
        phone: true,
        role: true,
        familyStatus: true,
        note: true,
      },
    }),
    prisma.resident.findMany({
      where: { houseId: house.id, createdBy: `warga:${house.id}:anggota` },
      orderBy: { id: "asc" },
      select: { name: true, note: true },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Pengkinian Data" subtitle="Data penghuni rumah" />

      <section className="-mt-2 px-5">
        <ResidentReadOnly
          block={house.block}
          no={house.no}
          name={existing?.name ?? house.ownerName ?? ""}
          phone={existing?.phone ?? ""}
          relation={existing?.role ?? "PEMILIK"}
          familyStatus={existing?.familyStatus ?? ""}
          religion={parseReligion(existing?.note ?? null)}
          members={members.map((m) => ({
            relation: parseRelation(m.note),
            name: m.name,
          }))}
          hasData={Boolean(existing)}
        />
      </section>

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
