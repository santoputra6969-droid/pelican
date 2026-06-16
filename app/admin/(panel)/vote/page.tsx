import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { VoteManager } from "@/components/admin/VoteManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminVotePage() {
  const votes = await prisma.vote.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      options: {
        orderBy: { order: "asc" },
        include: { _count: { select: { ballots: true } } },
      },
      _count: { select: { ballots: true } },
    },
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Kelola Vote"
        subtitle="Buat & kelola voting / polling warga"
      />
      <VoteManager
        votes={votes.map((v) => ({
          id: v.id,
          question: v.question,
          detail: v.detail,
          active: v.active,
          closesAt: v.closesAt ? v.closesAt.toISOString() : null,
          totalVotes: v._count.ballots,
          createdAt: v.createdAt.toISOString(),
          options: v.options.map((o) => ({
            id: o.id,
            label: o.label,
            count: o._count.ballots,
          })),
        }))}
      />
    </div>
  );
}
