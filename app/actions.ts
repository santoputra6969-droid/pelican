"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HOUSE_COOKIE } from "@/lib/session";
import { formatPeriod } from "@/lib/format";

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 180, // 180 hari
};

export async function selectHouse(formData: FormData) {
  const houseId = Number(formData.get("houseId") ?? "");
  if (!houseId) return;
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return;

  const store = await cookies();
  store.set(HOUSE_COOKIE, String(houseId), COOKIE_OPTS);
  redirect("/");
}

export async function clearHouse() {
  const store = await cookies();
  store.delete(HOUSE_COOKIE);
  redirect("/pilih-rumah");
}

export type PayResult =
  | { ok: true; period: string; amount: number }
  | { ok: false; message: string }
  | null;

export async function payBill(
  _prev: PayResult,
  formData: FormData
): Promise<PayResult> {
  const billId = Number(formData.get("billId") ?? "");

  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  if (!houseId || !billId) return { ok: false, message: "Sesi tidak valid." };

  const bill = await prisma.bill.findUnique({ where: { id: billId } });
  if (!bill || bill.houseId !== houseId)
    return { ok: false, message: "Tagihan tidak ditemukan." };
  if (bill.status === "PAID")
    return { ok: false, message: "Tagihan sudah dibayar." };

  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return { ok: false, message: "Rumah tidak ditemukan." };

  const periodLabel = formatPeriod(bill.year, bill.month);
  const actor = house.ownerName ?? `Blok ${house.block} No ${house.no}`;
  const notes = `PEMBAYARAN IPL ${house.block} No ${house.no} Untuk bulan ${bill.month} dan tahun ${bill.year}.`;

  await prisma.$transaction(async (tx) => {
    const trx = await tx.transaction.create({
      data: {
        category: "UTAMA",
        type: "IPL",
        notes,
        amount: bill.amount,
        mutation: "DEBIT", // pemasukan kas
        createdBy: actor,
      },
    });
    await tx.bill.update({
      where: { id: bill.id },
      data: { status: "PAID", transactionId: trx.id, updatedBy: actor },
    });
    const bal = await tx.balance.findFirst({ orderBy: { id: "asc" } });
    if (bal) {
      await tx.balance.update({
        where: { id: bal.id },
        data: {
          balance: { increment: bill.amount },
          lastTxId: String(trx.id),
          updatedBy: actor,
        },
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/bayar-ipl");
  revalidatePath("/transaksi");
  revalidatePath("/profil");

  return { ok: true, period: periodLabel, amount: bill.amount };
}
