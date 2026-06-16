import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { VoteForm } from "@/components/VoteForm";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function VotePage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const votes = await prisma.vote.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: {
      options: {
        orderBy: { order: "asc" },
        include: { _count: { select: { ballots: true } } },
      },
      ballots: { where: { houseId: house.id }, select: { optionId: true } },
      _count: { select: { ballots: true } },
    },
  });

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Voting Warga" subtitle="Sampaikan suara Anda" />

      <section className="mt-4 space-y-4 px-5">
        {votes.length === 0 ? (
          <div className="card p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
              <Icon name="check" size={24} />
            </div>
            <p className="mt-3 text-sm text-ink-faint">
              Belum ada voting saat ini.
            </p>
          </div>
        ) : (
          votes.map((v) => {
            const closed =
              !v.active || (v.closesAt != null && v.closesAt < new Date());
            const votedOptionId = v.ballots[0]?.optionId ?? null;
            return (
              <div key={v.id} className="card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      closed
                        ? "bg-black/5 text-ink-faint"
                        : "bg-pelican-50 text-pelican-700"
                    }`}
                  >
                    {closed ? "Ditutup" : "Aktif"}
                  </span>
                  <span className="text-[11px] text-ink-faint">
                    {v._count.ballots} suara
                  </span>
                </div>
                <h2 className="text-base font-bold text-ink">{v.question}</h2>
                {v.detail && (
                  <p className="mb-3 mt-0.5 text-sm text-ink-soft">{v.detail}</p>
                )}
                <div className="mt-3">
                  <VoteForm
                    voteId={v.id}
                    options={v.options.map((o) => ({
                      id: o.id,
                      label: o.label,
                      count: o._count.ballots,
                    }))}
                    totalVotes={v._count.ballots}
                    votedOptionId={votedOptionId}
                    closed={closed}
                  />
                </div>
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
