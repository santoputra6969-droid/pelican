import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function KontribusiPage() {
  const contributions = await prisma.contribution.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { entries: { select: { amount: true } } },
  });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Kontribusi" subtitle="Iuran & sumbangan warga" />

      <section className="mt-4 space-y-4 px-5">
        {contributions.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
              <Icon name="heart" size={24} />
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              Belum ada program kontribusi aktif.
            </p>
          </div>
        ) : (
          contributions.map((c) => {
            const collected = c.entries.reduce((s, e) => s + e.amount, 0);
            const pct = c.target
              ? Math.min(100, Math.round((collected / c.target) * 100))
              : null;
            return (
              <div key={c.id} className="card p-5">
                <h2 className="text-base font-bold text-ink">{c.title}</h2>
                {c.description && (
                  <p className="mt-0.5 text-sm text-ink-soft">{c.description}</p>
                )}
                <div className="mt-3 flex items-end justify-between">
                  <p className="text-xl font-extrabold text-pelican-700">
                    {formatRupiah(collected)}
                  </p>
                  {c.target && (
                    <p className="text-[11px] text-ink-faint">
                      target {formatRupiah(c.target)}
                    </p>
                  )}
                </div>
                {pct != null && (
                  <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-pelican-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
                <p className="mt-3 text-[11px] text-ink-faint">
                  Setoran dapat diserahkan ke pengurus. Catatan dana dikelola
                  transparan oleh pengelola.
                </p>
              </div>
            );
          })
        )}
      </section>

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
