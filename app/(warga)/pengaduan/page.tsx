import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { PengaduanForm } from "@/components/PengaduanForm";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  BARU: "bg-amber-50 text-amber-600",
  DIPROSES: "bg-sky-50 text-sky-600",
  SELESAI: "bg-pelican-50 text-pelican-700",
};

const STATUS_LABEL: Record<string, string> = {
  BARU: "Baru",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
};

export default async function PengaduanPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const complaints = await prisma.complaint.findMany({
    where: { houseId: house.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Pengaduan" subtitle="Sampaikan keluhan ke pengurus" />

      <section className="-mt-2 px-5">
        <PengaduanForm />
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Riwayat Pengaduan</h2>
        {complaints.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
              <Icon name="chat" size={24} />
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              Belum ada pengaduan. Kirim pengaduan pertama Anda di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                    {c.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      STATUS_STYLE[c.status] ?? "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink">{c.message}</p>
                <p className="mt-1.5 text-[11px] text-ink-faint">
                  {formatDateTime(c.createdAt.toISOString())}
                </p>
                {c.reply && (
                  <div className="mt-3 rounded-2xl bg-pelican-50/60 p-3">
                    <p className="text-[11px] font-bold text-pelican-700">
                      Tanggapan Pengurus
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">{c.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
