import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { ArsipList } from "@/components/ArsipList";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ArsipPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const archives = await prisma.archive.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Daftar Arsip" subtitle="Dokumen & laporan cluster" />

      <section className="-mt-2 px-5">
        <ArsipList
          archives={archives.map((a) => ({
            id: a.id,
            title: a.title,
            category: a.category,
            fileId: a.fileId,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </section>

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
