"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HOUSE_COOKIE } from "@/lib/session";
import { formatPeriod } from "@/lib/format";
import { createSnapTransaction } from "@/lib/midtrans";

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
  | { ok: true; period: string; amount: number; count: number }
  | { ok: false; message: string }
  | null;

export async function payBill(
  _prev: PayResult,
  formData: FormData
): Promise<PayResult> {
  const rawIds = String(formData.get("billIds") ?? formData.get("billId") ?? "");
  const billIds = rawIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  if (!houseId || billIds.length === 0)
    return { ok: false, message: "Sesi tidak valid." };

  const bills = await prisma.bill.findMany({
    where: { id: { in: billIds }, houseId },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  if (bills.length === 0)
    return { ok: false, message: "Tagihan tidak ditemukan." };

  const unpaid = bills.filter((b) => b.status !== "PAID");
  if (unpaid.length === 0)
    return { ok: false, message: "Tagihan sudah dibayar." };

  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return { ok: false, message: "Rumah tidak ditemukan." };

  const actor = house.ownerName ?? `Blok ${house.block} No ${house.no}`;
  const total = unpaid.reduce((sum, b) => sum + b.amount, 0);

  await prisma.$transaction(async (tx) => {
    let lastTxId = "";
    for (const bill of unpaid) {
      const notes = `PEMBAYARAN IPL ${house.block} No ${house.no} Untuk bulan ${bill.month} dan tahun ${bill.year}.`;
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
      lastTxId = String(trx.id);
    }
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
  });

  revalidatePath("/");
  revalidatePath("/bayar-ipl");
  revalidatePath("/transaksi");
  revalidatePath("/profil");

  const periodLabel =
    unpaid.length === 1
      ? formatPeriod(unpaid[0].year, unpaid[0].month)
      : `${unpaid.length} tagihan`;

  return { ok: true, period: periodLabel, amount: total, count: unpaid.length };
}

/* --------------------------- Midtrans payment --------------------------- */

export type CreatePaymentResult =
  | { ok: true; token: string; orderId: string; amount: number }
  | { ok: false; message: string }
  | null;

export async function createPayment(
  _prev: CreatePaymentResult,
  formData: FormData
): Promise<CreatePaymentResult> {
  const rawIds = String(formData.get("billIds") ?? formData.get("billId") ?? "");
  const advanceYear = Number(formData.get("advanceYear") ?? 0);
  const advanceMonths = String(formData.get("advanceMonths") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12);
  const billIds = rawIds
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  const hasAdvance = advanceYear > 0 && advanceMonths.length > 0;
  if (!houseId || (billIds.length === 0 && !hasAdvance))
    return { ok: false, message: "Sesi tidak valid." };

  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return { ok: false, message: "Rumah tidak ditemukan." };

  const bills = await prisma.bill.findMany({
    where: { id: { in: billIds }, houseId, status: { not: "PAID" } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });
  if (bills.length === 0 && !hasAdvance)
    return { ok: false, message: "Tidak ada tagihan yang bisa dibayar." };

  let validAdvance: { year: number; month: number; amount: number }[] = [];
  if (hasAdvance) {
    const now = new Date();
    if (advanceYear !== now.getFullYear()) {
      return { ok: false, message: "Pembayaran full hanya untuk tahun berjalan." };
    }
    const uniqueMonths = [...new Set(advanceMonths)].filter(
      (m) => m >= now.getMonth() + 1
    );
    const existing = await prisma.bill.findMany({
      where: { houseId, year: advanceYear, month: { in: uniqueMonths } },
      select: { month: true },
    });
    const existingSet = new Set(existing.map((x) => x.month));
    const invalidMonths = uniqueMonths.filter((m) => existingSet.has(m));
    if (invalidMonths.length > 0) {
      return {
        ok: false,
        message:
          "Sebagian bulan titipan sudah memiliki tagihan. Silakan refresh lalu pilih ulang.",
      };
    }
    validAdvance = uniqueMonths
      .filter((m) => !existingSet.has(m))
      .map((month) => ({ year: advanceYear, month, amount: house.iplAmount }));
  }

  if (bills.length === 0 && validAdvance.length === 0) {
    return { ok: false, message: "Tidak ada item pembayaran yang valid." };
  }

  const total =
    bills.reduce((sum, b) => sum + b.amount, 0) +
    validAdvance.reduce((sum, a) => sum + a.amount, 0);
  const orderId = `IPL-${houseId}-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;

  const items = [
    ...bills.map((b) => ({
      id: `B-${b.id}`,
      price: b.amount,
      quantity: 1,
      name: `IPL ${formatPeriod(b.year, b.month)}`.slice(0, 50),
    })),
    ...validAdvance.map((a) => ({
      id: `A-${a.year}${String(a.month).padStart(2, "0")}`,
      price: a.amount,
      quantity: 1,
      name: `IPL Titipan ${formatPeriod(a.year, a.month)}`.slice(0, 50),
    })),
  ];

  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";

  try {
    await prisma.payment.create({
      data: {
        orderId,
        houseId,
        billIds: [
          ...bills.map((b) => `B${b.id}`),
          ...validAdvance.map(
            (a) => `A${a.year}-${String(a.month).padStart(2, "0")}`
          ),
        ].join(","),
        amount: total,
        status: "PENDING",
        createdBy: house.ownerName ?? `Blok ${house.block} No ${house.no}`,
      },
    });

    const snap = await createSnapTransaction({
      orderId,
      grossAmount: total,
      items,
      customer: {
        first_name: house.ownerName ?? `Blok ${house.block}`,
        last_name: `No ${house.no}`,
      },
      finishRedirectUrl: baseUrl
        ? `${baseUrl}/bayar-ipl/selesai?order_id=${orderId}`
        : undefined,
      notificationUrl: baseUrl
        ? `${baseUrl}/api/midtrans/notification`
        : undefined,
    });

    await prisma.payment.update({
      where: { orderId },
      data: { snapToken: snap.token },
    });

    return { ok: true, token: snap.token, orderId, amount: total };
  } catch (err) {
    return {
      ok: false,
      message:
        err instanceof Error
          ? err.message
          : "Gagal membuat pembayaran. Coba lagi.",
    };
  }
}

/* ------------------------------ Pengaduan ------------------------------ */

export type ComplaintResult =
  | { ok: true }
  | { ok: false; message: string }
  | null;

const COMPLAINT_CATEGORIES = [
  "KEAMANAN",
  "KEBERSIHAN",
  "FASILITAS",
  "LINGKUNGAN",
  "UMUM",
];

export async function createComplaint(
  _prev: ComplaintResult,
  formData: FormData
): Promise<ComplaintResult> {
  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");

  const rawCategory = String(formData.get("category") ?? "UMUM").toUpperCase();
  const category = COMPLAINT_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : "UMUM";
  const message = String(formData.get("message") ?? "").trim();

  if (message.length < 5) {
    return { ok: false, message: "Tuliskan keluhan minimal 5 karakter." };
  }
  if (message.length > 2000) {
    return { ok: false, message: "Keluhan terlalu panjang (maks 2000 karakter)." };
  }

  let houseLabel: string | null = null;
  let ownerName: string | null = null;
  if (Number.isFinite(houseId) && houseId > 0) {
    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (house) {
      houseLabel = `Blok ${house.block} / No. ${house.no}`;
      ownerName = house.ownerName ?? null;
    }
  }

  try {
    await prisma.complaint.create({
      data: {
        houseId: Number.isFinite(houseId) && houseId > 0 ? houseId : null,
        houseLabel,
        ownerName,
        category,
        message,
      },
    });
    revalidatePath("/pengaduan");
    revalidatePath("/admin/pengaduan");
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, message: "Gagal mengirim pengaduan. Coba lagi." };
  }
}

/* -------------------------- Pengajuan Surat ----------------------------- */

export type LetterResult =
  | { ok: true }
  | { ok: false; message: string }
  | null;

const LETTER_TYPES = ["PENGANTAR", "DOMISILI", "KETERANGAN", "LAINNYA"];

export async function createLetterRequest(
  _prev: LetterResult,
  formData: FormData
): Promise<LetterResult> {
  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");

  const applicant = String(formData.get("applicant") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const rawType = String(formData.get("type") ?? "PENGANTAR").toUpperCase();
  const type = LETTER_TYPES.includes(rawType) ? rawType : "PENGANTAR";
  const purpose = String(formData.get("purpose") ?? "").trim();

  if (!applicant) return { ok: false, message: "Nama pemohon wajib diisi." };
  if (purpose.length < 5)
    return { ok: false, message: "Jelaskan keperluan minimal 5 karakter." };
  if (purpose.length > 2000)
    return { ok: false, message: "Keperluan terlalu panjang (maks 2000 karakter)." };

  let houseLabel: string | null = null;
  if (Number.isFinite(houseId) && houseId > 0) {
    const house = await prisma.house.findUnique({ where: { id: houseId } });
    if (house) houseLabel = `Blok ${house.block} / No. ${house.no}`;
  }

  try {
    await prisma.letterRequest.create({
      data: {
        houseId: Number.isFinite(houseId) && houseId > 0 ? houseId : null,
        houseLabel,
        applicant,
        phone,
        type,
        purpose,
      },
    });
    revalidatePath("/surat");
    revalidatePath("/admin/surat");
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, message: "Gagal mengirim pengajuan. Coba lagi." };
  }
}

/* ------------------------------- Voting --------------------------------- */

export type VoteResult =
  | { ok: true }
  | { ok: false; message: string }
  | null;

export async function castVote(
  _prev: VoteResult,
  formData: FormData
): Promise<VoteResult> {
  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  if (!Number.isFinite(houseId) || houseId <= 0)
    return { ok: false, message: "Pilih rumah dulu sebelum memberi suara." };

  const voteId = Number(formData.get("voteId") ?? 0);
  const optionId = Number(formData.get("optionId") ?? 0);
  if (!voteId || !optionId)
    return { ok: false, message: "Pilih salah satu opsi terlebih dahulu." };

  const vote = await prisma.vote.findUnique({
    where: { id: voteId },
    include: { options: true },
  });
  if (!vote || !vote.active) return { ok: false, message: "Voting tidak aktif." };
  if (vote.closesAt && vote.closesAt < new Date())
    return { ok: false, message: "Voting sudah ditutup." };
  if (!vote.options.some((o) => o.id === optionId))
    return { ok: false, message: "Opsi tidak valid." };

  const existing = await prisma.voteBallot.findUnique({
    where: { voteId_houseId: { voteId, houseId } },
  });
  if (existing) return { ok: false, message: "Rumah ini sudah memberikan suara." };

  const house = await prisma.house.findUnique({ where: { id: houseId } });

  try {
    await prisma.voteBallot.create({
      data: {
        voteId,
        optionId,
        houseId,
        voterName: house?.ownerName ?? `Blok ${house?.block} No ${house?.no}`,
      },
    });
    revalidatePath("/vote");
    revalidatePath("/admin/vote");
    return { ok: true };
  } catch {
    return { ok: false, message: "Gagal mengirim suara. Coba lagi." };
  }
}
