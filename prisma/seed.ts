import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();
const DATA = join(dirname(fileURLToPath(import.meta.url)), "scraped");

function load<T = any>(name: string): T {
  return JSON.parse(readFileSync(join(DATA, name), "utf8")) as T;
}

const toInt = (v: unknown, fallback = 0) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
};
const toFloat = (v: unknown, fallback = 0) => {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : fallback;
};
const date = (v: unknown) => (v ? new Date(String(v)) : new Date());
const bool = (v: unknown) => String(v) === "1" || v === true;

async function main() {
  console.log("🌱 Seeding database from scraped Puri Pelican data...");

  // --- Admin (dashboard rebuild) ---
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash,
      name: "Pengelola Pelican",
      role: "admin",
    },
  });
  console.log("  ✓ admin (admin / admin123)");

  // --- Wipe existing data (idempotent reseed) ---
  await prisma.bill.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.house.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.information.deleteMany();
  await prisma.transactionType.deleteMany();

  // --- Houses (+ owner names from house_details) ---
  const houses = load<any[]>("houses.json");
  const details = load<any[]>("house_details.json");
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
  console.log(`  ✓ ${houses.length} houses (${nameById.size} named)`);

  // --- Bills (unpaid + paid from house_details) ---
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
        transactionId:
          b.transactions_id != null ? toInt(b.transactions_id) : null,
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
  console.log(
    `  ✓ ${bills.length} bills (${
      bills.filter((b) => b.status === "PAID").length
    } paid)`
  );

  // --- Transactions (journal) ---
  const txs = load<any[]>("transactions.json");
  const seenSettle = new Set<string>();
  const txData: any[] = [];
  for (const t of txs) {
    let settle: string | null = t.id_settlement ?? null;
    if (settle && seenSettle.has(settle)) settle = null;
    if (settle) seenSettle.add(settle);
    txData.push({
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
    });
  }
  for (let i = 0; i < txData.length; i += 500) {
    await prisma.transaction.createMany({ data: txData.slice(i, i + 500) });
  }
  console.log(`  ✓ ${txData.length} transactions`);

  // --- Balance ---
  const bal = load<any>("balance.json");
  await prisma.balance.create({
    data: {
      balance: toFloat(bal.balance),
      balancePkk: toFloat(bal.balance_pkk),
      lastTxId: bal.last_update_id_transactions
        ? String(bal.last_update_id_transactions)
        : null,
      updatedBy: bal.created_by ?? null,
      createdAt: date(bal.created_at),
      updatedAt: date(bal.updated_at),
    },
  });
  console.log("  ✓ balance");

  // --- Banners ---
  const banners = load<any[]>("banners.json");
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
  console.log(`  ✓ ${banners.length} banners`);

  // --- Information ---
  const infos = load<any[]>("information.json");
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
  console.log(`  ✓ ${infos.length} informations`);

  // --- Transaction types ---
  const types = load<any[]>("transaction_types.json");
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
  console.log(`  ✓ ${seenType.size} transaction types`);

  console.log("✅ Seed complete. Admin login → admin / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
