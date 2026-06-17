import { prisma } from "@/lib/prisma";

export type CommunityFeeType = "KAS" | "PKK";

export type CommunityRow = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
  months: number;
  total: number;
  bills: { year: number; month: number; amount: number }[];
};

const NOTE_HOUSE_RE = /(?:PEMBAYARAN\s+(?:KAS|PKK)\s+)([A-Z0-9-]+)\s+No\s+([^\s,.]+)/i;
const NOTE_PERIOD_RE = /bulan\s+(\d{1,2})(?:\s+dan)?\s+tahun\s+(\d{4})/gi;

function parseHouseKey(notes: string | null | undefined) {
  if (!notes) return null;
  const m = notes.match(NOTE_HOUSE_RE);
  if (!m) return null;
  const block = String(m[1] ?? "").trim().toUpperCase();
  const no = String(m[2] ?? "").trim().toUpperCase();
  if (!block || !no) return null;
  return `${block}::${no}`;
}

function parsePeriods(notes: string | null | undefined) {
  if (!notes) return [] as { year: number; month: number }[];
  const out: { year: number; month: number }[] = [];
  NOTE_PERIOD_RE.lastIndex = 0;
  let m: RegExpExecArray | null = null;
  while ((m = NOTE_PERIOD_RE.exec(notes)) !== null) {
    const month = Number(m[1]);
    const year = Number(m[2]);
    if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year)) {
      out.push({ year, month });
    }
  }
  return out;
}

function toKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function getCommunityFeeRows({
  feeType,
  selectedBlock,
  selectedYear,
}: {
  feeType: CommunityFeeType;
  selectedBlock: string;
  selectedYear: number;
}) {
  const houseWhere = {
    ...(selectedBlock !== "SEMUA" ? { block: selectedBlock } : {}),
    ...(feeType === "KAS"
      ? { payCash: true, cashAmount: { not: null } }
      : { payPkk: true, pkkAmount: { not: null } }),
  };

  const [houses, blocks, txs] = await Promise.all([
    prisma.house.findMany({
      where: houseWhere,
      select: {
        id: true,
        block: true,
        no: true,
        ownerName: true,
        cashAmount: true,
        pkkAmount: true,
      },
      orderBy: [{ block: "asc" }, { no: "asc" }],
    }),
    prisma.house.findMany({
      where:
        feeType === "KAS"
          ? { payCash: true, cashAmount: { not: null } }
          : { payPkk: true, pkkAmount: { not: null } },
      distinct: ["block"],
      select: { block: true },
      orderBy: { block: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        mutation: "DEBIT",
        type: { equals: feeType, mode: "insensitive" },
      },
      select: { notes: true },
      take: 10000,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const paidByHouse = new Map<string, Set<string>>();
  for (const tx of txs) {
    const houseKey = parseHouseKey(tx.notes);
    if (!houseKey) continue;
    const periods = parsePeriods(tx.notes);
    if (periods.length === 0) continue;
    if (!paidByHouse.has(houseKey)) paidByHouse.set(houseKey, new Set<string>());
    const set = paidByHouse.get(houseKey)!;
    for (const p of periods) set.add(toKey(p.year, p.month));
  }

  const now = new Date();
  const nowYear = now.getFullYear();
  const limitMonth = selectedYear === nowYear ? now.getMonth() + 1 : 12;

  const rows: CommunityRow[] = [];
  for (const h of houses) {
    const amount = feeType === "KAS" ? (h.cashAmount ?? 20000) : (h.pkkAmount ?? 5000);
    const houseKey = `${h.block.toUpperCase()}::${h.no.toUpperCase()}`;
    const paid = paidByHouse.get(houseKey) ?? new Set<string>();

    const bills: { year: number; month: number; amount: number }[] = [];
    for (let month = 1; month <= limitMonth; month += 1) {
      const k = toKey(selectedYear, month);
      if (!paid.has(k)) bills.push({ year: selectedYear, month, amount });
    }

    if (bills.length === 0) continue;
    rows.push({
      id: h.id,
      block: h.block,
      no: h.no,
      ownerName: h.ownerName,
      months: bills.length,
      total: bills.reduce((s, b) => s + b.amount, 0),
      bills,
    });
  }

  return {
    rows,
    blocks: blocks.map((b) => b.block),
    totalPiutang: rows.reduce((s, r) => s + r.total, 0),
  };
}
