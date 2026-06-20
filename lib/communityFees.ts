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

export type CommunityFeeBill = { year: number; month: number; amount: number };

const NOTE_HOUSE_RE = /(?:PEMBAYARAN\s+(?:KAS|PKK)\s+)([A-Z0-9-]+)\s+No\s+([^\s,.]+)/i;
const NOTE_PERIOD_RE = /bulan\s+(\d{1,2})(?:\s+dan)?\s+tahun\s+(\d{4})/gi;

export function parseCommunityHouseKey(notes: string | null | undefined) {
  if (!notes) return null;
  const m = notes.match(NOTE_HOUSE_RE);
  if (!m) return null;
  const block = String(m[1] ?? "").trim().toUpperCase();
  const no = String(m[2] ?? "").trim().toUpperCase();
  if (!block || !no) return null;
  return `${block}::${no}`;
}

export function parseCommunityPeriods(notes: string | null | undefined) {
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

export function communityPeriodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

async function getCommunityFeeSnapshot(feeType: CommunityFeeType) {
  const [houses, txs, waivers] = await Promise.all([
    prisma.house.findMany({
      where:
        feeType === "KAS"
          ? { payCash: true }
          : { payPkk: true },
      select: {
        id: true,
        block: true,
        no: true,
        ownerName: true,
        cashAmount: true,
        pkkAmount: true,
        createdAt: true,
      },
      orderBy: [{ block: "asc" }, { no: "asc" }],
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
    prisma.feeWaiver.findMany({
      where: { feeType },
      select: { houseId: true, year: true, month: true },
    }),
  ]);

  const paidByHouse = new Map<string, Set<string>>();
  for (const tx of txs) {
    const houseKey = parseCommunityHouseKey(tx.notes);
    if (!houseKey) continue;
    const periods = parseCommunityPeriods(tx.notes);
    if (periods.length === 0) continue;
    if (!paidByHouse.has(houseKey)) paidByHouse.set(houseKey, new Set<string>());
    const set = paidByHouse.get(houseKey)!;
    for (const p of periods) set.add(communityPeriodKey(p.year, p.month));
  }

  // Periode yang diputihkan (write-off) diperlakukan seperti sudah lunas.
  const houseKeyById = new Map<number, string>();
  for (const h of houses) {
    houseKeyById.set(h.id, `${h.block.toUpperCase()}::${h.no.toUpperCase()}`);
  }
  for (const w of waivers) {
    const houseKey = houseKeyById.get(w.houseId);
    if (!houseKey) continue;
    if (!paidByHouse.has(houseKey)) paidByHouse.set(houseKey, new Set<string>());
    paidByHouse.get(houseKey)!.add(communityPeriodKey(w.year, w.month));
  }

  const paidYears = txs
    .flatMap((tx) => parseCommunityPeriods(tx.notes).map((p) => p.year))
    .filter((y) => Number.isInteger(y));

  return { houses, txs, paidByHouse, paidYears };
}

function resolveStartYear({
  includeAllYears,
  fallbackYear,
  paidYears,
}: {
  includeAllYears: boolean;
  fallbackYear: number;
  paidYears: number[];
}) {
  if (!includeAllYears) return fallbackYear;

  const years = [fallbackYear];
  if (paidYears.length > 0) years.push(Math.min(...paidYears));
  return Math.min(...years);
}

export async function getCommunityFeeRows({
  feeType,
  selectedBlock,
  selectedYear,
  includeAllYears = false,
}: {
  feeType: CommunityFeeType;
  selectedBlock: string;
  selectedYear?: number;
  includeAllYears?: boolean;
}) {
  const houseWhere = {
    ...(selectedBlock !== "SEMUA" ? { block: selectedBlock } : {}),
    ...(feeType === "KAS"
      ? { payCash: true }
      : { payPkk: true }),
  };

  const [{ houses: allHouses, txs, paidByHouse, paidYears }, blocks] = await Promise.all([
    getCommunityFeeSnapshot(feeType),
    prisma.house.findMany({
      where:
        feeType === "KAS"
          ? { payCash: true }
          : { payPkk: true },
      distinct: ["block"],
      select: { block: true },
      orderBy: { block: "asc" },
    }),
  ]);
  const houses = allHouses.filter((h) => {
    if (selectedBlock !== "SEMUA" && h.block !== selectedBlock) return false;
    return true;
  });

  const now = new Date();
  const nowYear = now.getFullYear();
  const targetYear = selectedYear ?? nowYear;

  const limitMonth = (year: number) => (year === nowYear ? now.getMonth() + 1 : 12);

  const rows: CommunityRow[] = [];
  for (const h of houses) {
    const firstYear = resolveStartYear({
      includeAllYears,
      fallbackYear: targetYear,
      paidYears,
    });
    const amount = feeType === "KAS" ? (h.cashAmount ?? 20000) : (h.pkkAmount ?? 5000);
    const houseKey = `${h.block.toUpperCase()}::${h.no.toUpperCase()}`;
    const paid = paidByHouse.get(houseKey) ?? new Set<string>();

    const bills: CommunityFeeBill[] = [];
    for (let year = firstYear; year <= targetYear; year += 1) {
      for (let month = 1; month <= limitMonth(year); month += 1) {
        const k = communityPeriodKey(year, month);
        if (!paid.has(k)) bills.push({ year, month, amount });
      }
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

export async function getCommunityFeeStatusForHouse({
  feeType,
  houseId,
  includeAllYears = false,
}: {
  feeType: CommunityFeeType;
  houseId: number;
  includeAllYears?: boolean;
}) {
  const { houses, paidByHouse, paidYears } = await getCommunityFeeSnapshot(feeType);
  const house = houses.find((entry) => entry.id === houseId);
  if (!house) {
    return {
      enabled: false,
      ownerName: null,
      block: null,
      no: null,
      amountPerMonth: 0,
      dueBills: [] as CommunityFeeBill[],
      paidBills: [] as CommunityFeeBill[],
      totalDue: 0,
    };
  }

  const now = new Date();
  const nowYear = now.getFullYear();
  const firstYear = resolveStartYear({
    includeAllYears,
    fallbackYear: nowYear,
    paidYears,
  });
  const limitMonth = (year: number) => (year === nowYear ? now.getMonth() + 1 : 12);
  const paid = paidByHouse.get(`${house.block.toUpperCase()}::${house.no.toUpperCase()}`) ?? new Set<string>();
  const amountPerMonth = feeType === "KAS" ? (house.cashAmount ?? 20000) : (house.pkkAmount ?? 5000);
  const dueBills: CommunityFeeBill[] = [];
  const paidBills: CommunityFeeBill[] = [];

  for (let year = firstYear; year <= nowYear; year += 1) {
    for (let month = 1; month <= limitMonth(year); month += 1) {
      const key = communityPeriodKey(year, month);
      const item = { year, month, amount: amountPerMonth };
      if (paid.has(key)) {
        paidBills.push(item);
      } else {
        dueBills.push(item);
      }
    }
  }

  return {
    enabled: true,
    ownerName: house.ownerName,
    block: house.block,
    no: house.no,
    amountPerMonth,
    dueBills,
    paidBills: paidBills.sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year)),
    totalDue: dueBills.reduce((sum, bill) => sum + bill.amount, 0),
  };
}
