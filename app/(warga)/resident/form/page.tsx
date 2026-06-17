import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { ResidentForm } from "@/components/ResidentForm";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";

export const dynamic = "force-dynamic";

function parseRelation(note: string | null) {
  if (!note) return "ANAK" as const;
  const match = note.match(/RELASI:([A-Z_]+)/);
  return match?.[1] === "KERABAT" ? ("KERABAT" as const) : ("ANAK" as const);
}

function parseReligion(note: string | null) {
  if (!note) return "";
  const match = note.match(/AGAMA:([A-Z]+)/);
  return match?.[1] ?? "";
}

export default async function ResidentFormPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const [houses, existing, members] = await Promise.all([
    prisma.house.findMany({
      select: { block: true, no: true },
      orderBy: [{ block: "asc" }, { no: "asc" }],
    }),
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
      <PageHeader title="Pengkinian Data" subtitle="Lengkapi data penghuni rumah" />

      <section className="-mt-2 px-5">
        <ResidentForm
          houses={houses}
          selectedBlock={house.block}
          selectedNo={house.no}
          defaultName={existing?.name ?? house.ownerName ?? ""}
          defaultPhone={existing?.phone ?? ""}
          defaultRelation={existing?.role ?? "PEMILIK"}
          defaultFamilyStatus={existing?.familyStatus ?? ""}
          defaultReligion={parseReligion(existing?.note ?? null)}
          defaultMembers={members.map((m) => ({
            relation: parseRelation(m.note),
            name: m.name,
          }))}
        />
      </section>

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
