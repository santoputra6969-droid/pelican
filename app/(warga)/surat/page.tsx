import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { SuratForm } from "@/components/SuratForm";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  PENGANTAR: "Surat Pengantar",
  DOMISILI: "Surat Domisili",
  KETERANGAN: "Surat Keterangan",
  LAINNYA: "Lainnya",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  DIPROSES: "bg-sky-50 text-sky-600",
  SELESAI: "bg-pelican-50 text-pelican-700",
  DITOLAK: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Baru",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

export default async function SuratPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const letters = await prisma.letterRequest.findMany({
    where: { houseId: house.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Ajukan Surat" subtitle="Permohonan surat ke pengelola" />

      <section className="-mt-2 px-5">
        <SuratForm defaultName={house.ownerName ?? undefined} />
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Riwayat Pengajuan</h2>
        {letters.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
              <Icon name="receipt" size={24} />
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              Belum ada pengajuan surat.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map((l) => (
              <div key={l.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                    {TYPE_LABEL[l.type] ?? l.type}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      STATUS_STYLE[l.status] ?? "bg-black/5 text-ink-soft"
                    }`}
                  >
                    {STATUS_LABEL[l.status] ?? l.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{l.purpose}</p>
                {l.note && (
                  <p className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-ink-soft">
                    <span className="font-semibold">Pengelola:</span> {l.note}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-ink-faint">
                  {formatDateTime(l.createdAt)}
                </p>
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
