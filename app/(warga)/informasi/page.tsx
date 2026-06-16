import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InformasiPage() {
  const infos = await prisma.information.findMany({
    where: { published: true },
    orderBy: [{ isPin: "desc" }, { createdAt: "desc" }],
  });

  return (
    <main className="flex min-h-screen flex-col pb-24">
      <PageHeader title="Informasi" subtitle="Kabar terbaru dari pengelola" />

      <section className="-mt-2 px-5">
        {infos.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-12 text-center">
            <Icon name="megaphone" size={40} className="text-ink-faint" />
            <p className="text-sm font-semibold text-ink">Belum ada informasi</p>
          </div>
        ) : (
          <div className="space-y-3">
            {infos.map((info) => (
              <article key={info.id} className="card overflow-hidden">
                {info.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={info.image}
                    alt={info.title}
                    className="aspect-video w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    {info.isPin && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-600">
                        Disematkan
                      </span>
                    )}
                    <span className="text-[11px] text-ink-faint">
                      {formatDate(info.createdAt)}
                    </span>
                  </div>
                  <h2 className="mt-2 text-base font-bold text-ink">
                    {info.title}
                  </h2>
                  <div
                    className="prose-info mt-1 text-sm leading-relaxed text-ink-soft [&_a]:text-pelican-600 [&_p]:my-1"
                    dangerouslySetInnerHTML={{ __html: info.content }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <BottomNav />
    </main>
  );
}
