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

  const refs = payment.billIds
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const billIds = refs
    .map((ref) => {
      if (/^\d+$/.test(ref)) return Number(ref); // kompatibilitas lama
      if (/^B\d+$/.test(ref)) return Number(ref.slice(1));
      return null;
    })
    .filter((n): n is number => Number.isInteger(n) && (n ?? 0) > 0);

  const advanceRefs = refs
    .map((ref) => {
      const m = /^A(\d{4})-(\d{2})$/.exec(ref);
      if (!m) return null;
      const year = Number(m[1]);
      const month = Number(m[2]);
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12)
        return null;
      return { year, month };
    })
    .filter((x): x is { year: number; month: number } => Boolean(x));

  const communityRefs = refs
    .map((ref) => {
      const m = /^C(KAS|PKK)-(\d{4})-(\d{2})$/.exec(ref);
      if (!m) return null;
      const feeType = m[1] as "KAS" | "PKK";
      const year = Number(m[2]);
      const month = Number(m[3]);
      if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
        return null;
      }
      return { feeType, year, month };
    })
    .filter(
      (x): x is { feeType: "KAS" | "PKK"; year: number; month: number } => Boolean(x)
    );

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

    let totalUtama = 0;
    let totalPkk = 0;
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
      totalUtama += bill.amount;
      lastTxId = String(trx.id);
    }

    for (const adv of advanceRefs) {
      const existing = await tx.bill.findUnique({
        where: {
          houseId_year_month: {
            houseId: payment.houseId,
            year: adv.year,
            month: adv.month,
          },
        },
      });

      if (existing?.status === "PAID") continue;

      const amount = existing?.amount ?? house.iplAmount;
      const notes = `PEMBAYARAN IPL TITIPAN ${house.block} No ${house.no} Untuk bulan ${adv.month} dan tahun ${adv.year}.`;
      const trx = await tx.transaction.create({
        data: {
          category: "UTAMA",
          type: "IPL",
          idSettlement: `${orderId}-ADV-${adv.year}${String(adv.month).padStart(2, "0")}`,
          notes,
          amount,
          mutation: "DEBIT",
          createdBy: actor,
        },
      });

      if (existing) {
        await tx.bill.update({
          where: { id: existing.id },
          data: { status: "PAID", transactionId: trx.id, updatedBy: actor },
        });
      } else {
        await tx.bill.create({
          data: {
            houseId: payment.houseId,
            year: adv.year,
            month: adv.month,
            amount,
            status: "PAID",
            transactionId: trx.id,
            createdBy: actor,
            updatedBy: actor,
          },
        });
      }

      totalUtama += amount;
      lastTxId = String(trx.id);
    }

    for (const item of communityRefs) {
      const amount =
        item.feeType === "KAS"
          ? house.cashAmount ?? 20000
          : house.pkkAmount ?? 5000;
      const notes = `PEMBAYARAN ${item.feeType} ${house.block} No ${house.no} Untuk bulan ${item.month} dan tahun ${item.year}.`;
      const trx = await tx.transaction.create({
        data: {
          category: item.feeType === "PKK" ? "PKK" : "UTAMA",
          type: item.feeType,
          idSettlement: `${orderId}-${item.feeType}-${item.year}${String(item.month).padStart(2, "0")}`,
          notes,
          amount,
          mutation: "DEBIT",
          createdBy: actor,
        },
      });

      if (item.feeType === "PKK") {
        totalPkk += amount;
      } else {
        totalUtama += amount;
      }
      lastTxId = String(trx.id);
    }

    if (totalUtama > 0 || totalPkk > 0) {
      const bal = await tx.balance.findFirst({ orderBy: { id: "asc" } });
      if (bal) {
        await tx.balance.update({
          where: { id: bal.id },
          data: {
            ...(totalUtama > 0 ? { balance: { increment: totalUtama } } : {}),
            ...(totalPkk > 0 ? { balancePkk: { increment: totalPkk } } : {}),
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
  revalidatePath("/bayar-kas");
  revalidatePath("/bayar-pkk");
  revalidatePath("/transaksi");
  revalidatePath("/profil");
  revalidatePath("/admin/transaksi");
  revalidatePath("/admin");
  revalidatePath("/menu");

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
