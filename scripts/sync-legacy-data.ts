import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const DATA = join(dirname(fileURLToPath(import.meta.url)), "..", "prisma", "scraped");

function load<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
}

const toInt = (v: unknown, fallback = 0) => {
  const n = Number.parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
const toFloat = (v: unknown, fallback = 0) => {
  const n = Number.parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};
const date = (v: unknown) => (v ? new Date(String(v)) : new Date());
const bool = (v: unknown) => String(v) === "1" || v === true;

async function fixSequences() {
  const tables = ["House", "Bill", "Transaction", "Banner", "TransactionType", "Balance"];
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), (SELECT COALESCE(MAX(id), 0) FROM "${table}") + 1, false)`
      );
    } catch {
      // Ignore if not Postgres sequence.
    }
  }
}

async function main() {
  console.log("== Force sync data from prisma/scraped ==");

  const houses = load<any[]>("houses.json");
  const details = load<any[]>("house_details.json");
  const txs = load<any[]>("transactions.json");
  const bal = load<any>("balance.json");
  const banners = load<any[]>("banners.json");
  const infos = load<any[]>("information.json");
  const types = load<any[]>("transaction_types.json");

  // Wipe tables related to angka/ringkasan so old source becomes single truth.
  await prisma.$transaction(async (tx) => {
    await tx.bill.deleteMany();
    await tx.transaction.deleteMany();
    await tx.balance.deleteMany();
    await tx.banner.deleteMany();
    await tx.information.deleteMany();
    await tx.transactionType.deleteMany();
    await tx.resident.deleteMany();
    await tx.house.deleteMany();
  });

  const nameById = new Map<number, string>();
  for (const d of details) {
    if (d.name && d.name !== "-") nameById.set(Number(d.id), String(d.name));
  }

  await prisma.house.createMany({
    data: houses.map((h) => ({
      id: Number(h.id),
      block: String(h.block),
      no: String(h.no),
      ownerName: nameById.get(Number(h.id)) ?? null,
      occupied: bool(h.occupied),
      occupiedByOwner: bool(h.occupied_by_owner),
      payIpl: bool(h.pay_ipl),
      iplAmount: toInt(h.ipl_amount, 252000),
      payCash: bool(h.pay_cash),
      cashAmount: h.cash_amount != null ? toInt(h.cash_amount) : null,
      payPkk: bool(h.pay_pkk),
      pkkAmount: h.pkk_amount != null ? toInt(h.pkk_amount) : null,
      createdAt: date(h.created_at),
    })),
  });

  const billMap = new Map<number, any>();
  for (const d of details) {
    for (const b of [...(d.unpaid ?? []), ...(d.paid ?? [])]) {
      const id = Number(b.id);
      if (billMap.has(id)) continue;
      billMap.set(id, {
        id,
        houseId: toInt(b.house_id),
        year: toInt(b.year_bill),
        month: toInt(b.month_bill),
        amount: toInt(b.amount),
        status: String(b.status ?? "UNPAID"),
        transactionId: b.transactions_id != null ? toInt(b.transactions_id) : null,
        createdBy: b.created_by ?? null,
        updatedBy: b.updated_by ?? null,
        createdAt: date(b.created_at),
        updatedAt: date(b.updated_at),
      });
    }
  }
  const houseIds = new Set(houses.map((h) => Number(h.id)));
  const bills = [...billMap.values()].filter((b) => houseIds.has(b.houseId));
  for (let i = 0; i < bills.length; i += 500) {
    await prisma.bill.createMany({ data: bills.slice(i, i + 500) });
  }

  const seenSettle = new Set<string>();
  const txData = txs.map((t) => {
    let settle: string | null = t.id_settlement ?? null;
    if (settle && seenSettle.has(settle)) settle = null;
    if (settle) seenSettle.add(settle);
    return {
      id: Number(t.id),
      category: String(t.category ?? "UTAMA"),
      type: t.type ?? null,
      idSettlement: settle,
      notes: t.notes ?? null,
      amount: toInt(t.amount),
      mutation: String(t.mutation ?? "DEBIT"),
      image: t.image ?? null,
      createdBy: t.created_by ?? null,
      createdAt: date(t.created_at),
    };
  });
  for (let i = 0; i < txData.length; i += 500) {
    await prisma.transaction.createMany({ data: txData.slice(i, i + 500) });
  }

  await prisma.balance.create({
    data: {
      balance: toFloat(bal.balance),
      balancePkk: toFloat(bal.balance_pkk),
      lastTxId: bal.last_update_id_transactions ? String(bal.last_update_id_transactions) : null,
      updatedBy: bal.created_by ?? null,
      createdAt: date(bal.created_at),
      updatedAt: date(bal.updated_at),
    },
  });

  await prisma.banner.createMany({
    data: banners.map((b, i) => ({
      id: Number(b.id),
      image: String(b.banner),
      order: i,
      active: true,
      createdBy: b.created_by ?? null,
      createdAt: date(b.created_at),
    })),
  });

  for (const info of infos) {
    await prisma.information.create({
      data: {
        legacyId: Number(info.id),
        title: String(info.title ?? "Informasi"),
        content: String(info.content ?? ""),
        image: info.banner ?? null,
        isPin: bool(info.is_pin),
        published: true,
        createdBy: info.created_by ?? null,
        createdAt: date(info.created_at),
      },
    });
  }

  const seenType = new Set<string>();
  await prisma.transactionType.createMany({
    data: types
      .filter((t) => {
        const n = String(t.name);
        if (seenType.has(n)) return false;
        seenType.add(n);
        return true;
      })
      .map((t) => ({
        id: Number(t.id),
        name: String(t.name),
        createdBy: t.created_by ?? null,
        createdAt: date(t.created_at),
      })),
  });

  await fixSequences();

  console.log("Done.");
  console.log(`houses=${houses.length}`);
  console.log(`bills=${bills.length}`);
  console.log(`transactions=${txData.length}`);
  console.log(`banners=${banners.length}`);
  console.log(`information=${infos.length}`);
  console.log(`txTypes=${seenType.size}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
