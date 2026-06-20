import { prisma } from "@/lib/prisma";

export const TAKEOVER_MIN_INSTALLMENT = 50000;

export type TakeoverSummary = {
  houseId: number;
  totalAmount: number;
  paid: number; // cicilan POSTED (sudah dikonfirmasi)
  pending: number; // cicilan menunggu konfirmasi (online REVIEW + manual PENDING)
  remaining: number; // sisa = total - paid
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Ringkasan takeover IPL lama untuk satu rumah.
 * Mengembalikan null bila rumah tidak punya record takeover.
 */
export async function getTakeoverForHouse(
  houseId: number
): Promise<TakeoverSummary | null> {
  const takeover = await prisma.iplTakeover.findUnique({ where: { houseId } });
  if (!takeover) return null;

  const [postedAgg, pendingManualAgg, pendingOnline] = await Promise.all([
    prisma.iplTakeoverPayment.aggregate({
      where: { houseId, status: "POSTED" },
      _sum: { amount: true },
    }),
    prisma.iplTakeoverPayment.aggregate({
      where: { houseId, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { houseId, status: "REVIEW", billIds: { startsWith: "TKO" } },
      _sum: { amount: true },
    }),
  ]);

  const paid = postedAgg._sum.amount ?? 0;
  const pending =
    (pendingManualAgg._sum.amount ?? 0) + (pendingOnline._sum.amount ?? 0);
  const remaining = Math.max(0, takeover.totalAmount - paid);

  return {
    houseId,
    totalAmount: takeover.totalAmount,
    paid,
    pending,
    remaining,
    note: takeover.note,
    createdBy: takeover.createdBy,
    createdAt: takeover.createdAt,
    updatedAt: takeover.updatedAt,
  };
}

export type TakeoverAdminRow = TakeoverSummary & {
  block: string;
  no: string;
  ownerName: string | null;
};

/** Semua rumah yang punya takeover IPL lama, untuk panel admin. */
export async function getAllTakeovers(): Promise<TakeoverAdminRow[]> {
  const takeovers = await prisma.iplTakeover.findMany();
  if (takeovers.length === 0) return [];

  const houseIds = takeovers.map((t) => t.houseId);
  const [houses, posted, pendingManual, pendingOnline] = await Promise.all([
    prisma.house.findMany({ where: { id: { in: houseIds } } }),
    prisma.iplTakeoverPayment.groupBy({
      by: ["houseId"],
      where: { houseId: { in: houseIds }, status: "POSTED" },
      _sum: { amount: true },
    }),
    prisma.iplTakeoverPayment.groupBy({
      by: ["houseId"],
      where: { houseId: { in: houseIds }, status: "PENDING" },
      _sum: { amount: true },
    }),
    prisma.payment.findMany({
      where: {
        houseId: { in: houseIds },
        status: "REVIEW",
        billIds: { startsWith: "TKO" },
      },
      select: { houseId: true, amount: true },
    }),
  ]);

  const houseMap = new Map(houses.map((h) => [h.id, h]));
  const postedMap = new Map(posted.map((p) => [p.houseId, p._sum.amount ?? 0]));
  const pendingManualMap = new Map(
    pendingManual.map((p) => [p.houseId, p._sum.amount ?? 0])
  );
  const pendingOnlineMap = new Map<number, number>();
  for (const p of pendingOnline) {
    pendingOnlineMap.set(
      p.houseId,
      (pendingOnlineMap.get(p.houseId) ?? 0) + p.amount
    );
  }

  const rows: TakeoverAdminRow[] = takeovers.map((t) => {
    const house = houseMap.get(t.houseId);
    const paid = postedMap.get(t.houseId) ?? 0;
    const pending =
      (pendingManualMap.get(t.houseId) ?? 0) +
      (pendingOnlineMap.get(t.houseId) ?? 0);
    return {
      houseId: t.houseId,
      totalAmount: t.totalAmount,
      paid,
      pending,
      remaining: Math.max(0, t.totalAmount - paid),
      note: t.note,
      createdBy: t.createdBy,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      block: house?.block ?? "-",
      no: house?.no ?? "-",
      ownerName: house?.ownerName ?? null,
    };
  });

  rows.sort((a, b) => {
    const blockCmp = a.block.localeCompare(b.block, undefined, { numeric: true });
    if (blockCmp !== 0) return blockCmp;
    return (parseInt(a.no, 10) || 0) - (parseInt(b.no, 10) || 0);
  });

  return rows;
}
