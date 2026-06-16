import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatPeriod } from "@/lib/format";

/**
 * Settle pembayaran Midtrans untuk sebuah orderId.
 * Idempoten: bila Payment sudah PAID, tidak melakukan apa-apa.
 * Dipanggil dari webhook saat transaction_status = settlement/capture.
 */
export async function settlePayment(
  orderId: string,
  info?: { paymentType?: string | null; settlementTransactionId?: string | null }
): Promise<{ ok: boolean; reason?: string }> {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment) return { ok: false, reason: "payment-not-found" };
  if (payment.status === "PAID") return { ok: true, reason: "already-paid" };

  const billIds = payment.billIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const house = await prisma.house.findUnique({
    where: { id: payment.houseId },
  });
  if (!house) return { ok: false, reason: "house-not-found" };

  const actor = "MIDTRANS";

  await prisma.$transaction(async (tx) => {
    const bills = await tx.bill.findMany({
      where: { id: { in: billIds }, houseId: payment.houseId },
    });
    const unpaid = bills.filter((b) => b.status !== "PAID");

    let total = 0;
    let lastTxId = "";
    for (const bill of unpaid) {
      const notes = `PEMBAYARAN IPL ${house.block} No ${house.no} Untuk bulan ${bill.month} dan tahun ${bill.year}.`;
      const trx = await tx.transaction.create({
        data: {
          category: "UTAMA",
          type: "IPL",
          idSettlement: `${orderId}-${bill.id}`,
          notes,
          amount: bill.amount,
          mutation: "DEBIT",
          createdBy: actor,
        },
      });
      await tx.bill.update({
        where: { id: bill.id },
        data: { status: "PAID", transactionId: trx.id, updatedBy: actor },
      });
      total += bill.amount;
      lastTxId = String(trx.id);
    }

    if (total > 0) {
      const bal = await tx.balance.findFirst({ orderBy: { id: "asc" } });
      if (bal) {
        await tx.balance.update({
          where: { id: bal.id },
          data: {
            balance: { increment: total },
            lastTxId,
            updatedBy: actor,
          },
        });
      }
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paymentType: info?.paymentType ?? payment.paymentType,
        settledAt: new Date(),
      },
    });
  });

  revalidatePath("/");
  revalidatePath("/bayar-ipl");
  revalidatePath("/transaksi");
  revalidatePath("/profil");
  revalidatePath("/admin/transaksi");
  revalidatePath("/admin");

  return { ok: true };
}

/**
 * Tandai pembayaran gagal/kedaluwarsa/batal (tidak menyentuh tagihan).
 */
export async function markPaymentStatus(
  orderId: string,
  status: "EXPIRED" | "FAILED" | "CANCEL"
): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { orderId } });
  if (!payment || payment.status === "PAID") return;
  await prisma.payment.update({
    where: { id: payment.id },
    data: { status },
  });
  revalidatePath("/bayar-ipl");
}

/** Label periode untuk ringkasan (single vs banyak). */
export function paymentPeriodLabel(
  bills: { year: number; month: number }[]
): string {
  if (bills.length === 1) return formatPeriod(bills[0].year, bills[0].month);
  return `${bills.length} tagihan`;
}
