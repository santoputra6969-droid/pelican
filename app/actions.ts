"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HOUSE_COOKIE } from "@/lib/session";
import { formatPeriod } from "@/lib/format";
import { createSnapTransaction } from "@/lib/midtrans";
import { getCommunityFeeStatusForHouse } from "@/lib/communityFees";

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
  let payableBills = [...bills];

  if (payableBills.length === 0 && !hasAdvance)
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
    });
    const paidExisting = existing.filter((x) => x.status === "PAID");
    if (paidExisting.length > 0) {
      return {
        ok: false,
        message:
          "Sebagian bulan titipan sudah memiliki tagihan. Silakan refresh lalu pilih ulang.",
      };
    }

    const payableSet = new Set(payableBills.map((b) => b.id));
    for (const row of existing) {
      if (row.status !== "PAID" && !payableSet.has(row.id)) {
        payableBills.push(row);
        payableSet.add(row.id);
      }
    }

    const existingSet = new Set(existing.map((x) => x.month));
    validAdvance = uniqueMonths
      .filter((m) => !existingSet.has(m))
      .map((month) => ({ year: advanceYear, month, amount: house.iplAmount }));
  }

  payableBills = payableBills.sort((a, b) =>
    a.year === b.year ? a.month - b.month : a.year - b.year
  );

  if (payableBills.length === 0 && validAdvance.length === 0) {
    return { ok: false, message: "Tidak ada item pembayaran yang valid." };
  }

  const total =
    payableBills.reduce((sum, b) => sum + b.amount, 0) +
    validAdvance.reduce((sum, a) => sum + a.amount, 0);
  const orderId = `IPL-${houseId}-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;

  const items = [
    ...payableBills.map((b) => ({
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
          ...payableBills.map((b) => `B${b.id}`),
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

export async function createCommunityFeePayment(
  _prev: CreatePaymentResult,
  formData: FormData
): Promise<CreatePaymentResult> {
  const rawFeeType = String(formData.get("feeType") ?? "").toUpperCase();
  const feeType = rawFeeType === "PKK" ? "PKK" : rawFeeType === "KAS" ? "KAS" : null;
  const rawScope = String(formData.get("scope") ?? "all").toLowerCase();
  const scope = rawScope === "oldest" ? "oldest" : rawScope === "selected" ? "selected" : "all";
  const selectedPeriods = String(formData.get("selectedPeriods") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s));

  const store = await cookies();
  const houseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  if (!houseId || !feeType) {
    return { ok: false, message: "Sesi atau jenis iuran tidak valid." };
  }

  const house = await prisma.house.findUnique({ where: { id: houseId } });
  if (!house) return { ok: false, message: "Rumah tidak ditemukan." };

  const status = await getCommunityFeeStatusForHouse({
    feeType,
    houseId,
    includeAllYears: true,
  });
  if (!status.enabled) {
    return { ok: false, message: `Iuran ${feeType} tidak aktif untuk rumah ini.` };
  }
  if (status.dueBills.length === 0) {
    return { ok: false, message: `Tidak ada tunggakan ${feeType.toLowerCase()} untuk dibayar.` };
  }

  let payableBills = scope === "oldest" ? [status.dueBills[0]] : status.dueBills;

  if (scope === "selected") {
    const dueKeys = status.dueBills.map((bill) =>
      `${bill.year}-${String(bill.month).padStart(2, "0")}`
    );
    const selectedUnique = [...new Set(selectedPeriods)];
    if (selectedUnique.length === 0) {
      return { ok: false, message: "Pilih minimal 1 bulan untuk Bayar Sekaligus." };
    }

    const selectedIndexes = selectedUnique.map((key) => dueKeys.indexOf(key));
    if (selectedIndexes.some((index) => index < 0)) {
      return { ok: false, message: "Pilihan bulan tidak valid. Silakan refresh halaman." };
    }

    const maxIndex = Math.max(...selectedIndexes);
    const mustPayKeys = dueKeys.slice(0, maxIndex + 1);
    const selectedSet = new Set(selectedUnique);
    const isPrefix = mustPayKeys.every((key) => selectedSet.has(key)) && selectedSet.size === mustPayKeys.length;
    if (!isPrefix) {
      return {
        ok: false,
        message: "Bayar Sekaligus harus urut dari tunggakan bulan paling lama.",
      };
    }

    payableBills = status.dueBills.slice(0, maxIndex + 1);
  }

  const total = payableBills.reduce((sum, bill) => sum + bill.amount, 0);
  const orderId = `${feeType}-${houseId}-${Date.now()}-${Math.floor(
    Math.random() * 1000
  )
    .toString()
    .padStart(3, "0")}`;
  const refs = payableBills.map(
    (bill) => `C${feeType}-${bill.year}-${String(bill.month).padStart(2, "0")}`
  );
  const items = payableBills.map((bill) => ({
    id: `${feeType}-${bill.year}${String(bill.month).padStart(2, "0")}`,
    price: bill.amount,
    quantity: 1,
    name: `${feeType} ${formatPeriod(bill.year, bill.month)}`.slice(0, 50),
  }));

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";

  try {
    await prisma.payment.create({
      data: {
        orderId,
        houseId,
        billIds: refs.join(","),
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
          : `Gagal membuat pembayaran ${feeType}. Coba lagi.`,
    };
  }
}

/* ------------------------------ Pengaduan ------------------------------ */

export type ComplaintResult =
  | { ok: true }
  | { ok: false; message: string }
  | null;

export type ResidentFormResult =
  | { ok: true; message: string }
  | { ok: false; message: string }
  | null;

type ResidentMemberInput = {
  relation: "ANAK" | "KERABAT" | "SUAMI" | "ISTRI";
  name: string;
};

const RESIDENT_RELATIONS = ["PEMILIK", "PENGHUNI"] as const;
const RESIDENT_STATUSES = [
  "BELUM_KAWIN",
  "KAWIN",
  "KAWIN_ANAK_1",
  "KAWIN_ANAK_2",
  "KAWIN_ANAK_3",
  "KAWIN_ANAK_4",
  "KAWIN_ANAK_5",
  "BERCERAI",
  "BERCERAI_ANAK_1",
  "BERCERAI_ANAK_2",
  "BERCERAI_ANAK_3",
  "BERCERAI_ANAK_4",
  "BERCERAI_ANAK_5",
] as const;
const RESIDENT_RELIGIONS = [
  "ISLAM",
  "KRISTEN",
  "KATHOLIK",
  "BUDDHA",
  "HINDU",
  "KHONGHUCU",
] as const;

export async function submitResidentForm(
  _prev: ResidentFormResult,
  formData: FormData
): Promise<ResidentFormResult> {
  const store = await cookies();
  const selectedHouseId = Number(store.get(HOUSE_COOKIE)?.value ?? "");
  if (!Number.isFinite(selectedHouseId) || selectedHouseId <= 0) {
    return { ok: false, message: "Silakan pilih rumah Anda terlebih dahulu." };
  }

  const block = String(formData.get("block") ?? "").trim();
  const no = String(formData.get("no") ?? "").trim();
  const relationRaw = String(formData.get("relation") ?? "PEMILIK").toUpperCase();
  const relation = RESIDENT_RELATIONS.includes(relationRaw as (typeof RESIDENT_RELATIONS)[number])
    ? relationRaw
    : "PEMILIK";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const familyStatusRaw = String(formData.get("familyStatus") ?? "").toUpperCase();
  const familyStatus = RESIDENT_STATUSES.includes(
    familyStatusRaw as (typeof RESIDENT_STATUSES)[number]
  )
    ? familyStatusRaw
    : "";
  const religionRaw = String(formData.get("religion") ?? "").toUpperCase();
  const religion = RESIDENT_RELIGIONS.includes(
    religionRaw as (typeof RESIDENT_RELIGIONS)[number]
  )
    ? religionRaw
    : "";
  const membersRaw = String(formData.get("members") ?? "[]");

  if (!block || !no || !name || !phone || !familyStatus || !religion) {
    return { ok: false, message: "Semua field wajib harus diisi." };
  }

  const targetHouse = await prisma.house.findUnique({
    where: { block_no: { block, no } },
    select: { id: true },
  });
  if (!targetHouse) {
    return { ok: false, message: "Blok / nomor rumah tidak valid." };
  }
  if (targetHouse.id !== selectedHouseId) {
    return {
      ok: false,
      message: "Blok / nomor rumah harus sesuai rumah yang sedang aktif.",
    };
  }

  const existing = await prisma.resident.findFirst({
    where: { houseId: selectedHouseId, createdBy: `warga:${selectedHouseId}` },
    orderBy: { id: "asc" },
  });

  let parsedMembers: unknown = [];
  try {
    parsedMembers = JSON.parse(membersRaw);
  } catch {
    return { ok: false, message: "Format anggota rumah tidak valid." };
  }

  const members: ResidentMemberInput[] = Array.isArray(parsedMembers)
    ? parsedMembers
        .map((m) => ({
          relation: String((m as { relation?: unknown }).relation ?? "").toUpperCase(),
          name: String((m as { name?: unknown }).name ?? "").trim(),
        }))
        .filter((m) => m.name.length > 0)
        .map((m) => ({
          relation:
            m.relation === "KERABAT"
              ? "KERABAT"
              : m.relation === "SUAMI"
                ? "SUAMI"
                : m.relation === "ISTRI"
                  ? "ISTRI"
                  : "ANAK",
          name: m.name,
        }))
    : [];

  if (members.length > 30) {
    return { ok: false, message: "Maksimal 30 anggota rumah." };
  }

  const note = `AGAMA:${religion};SUMBER:WARGA_FORM`;
  const memberCreatedBy = `warga:${selectedHouseId}:anggota`;

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.resident.update({
        where: { id: existing.id },
        data: {
          role: relation,
          name,
          phone,
          familyStatus,
          note,
          active: true,
        },
      });
    } else {
      await tx.resident.create({
        data: {
          houseId: selectedHouseId,
          role: relation,
          name,
          phone,
          familyStatus,
          note,
          active: true,
          createdBy: `warga:${selectedHouseId}`,
        },
      });
    }

    await tx.resident.deleteMany({
      where: { houseId: selectedHouseId, createdBy: memberCreatedBy },
    });

    if (members.length > 0) {
      await tx.resident.createMany({
        data: members.map((m) => ({
          houseId: selectedHouseId,
          role: "PENGHUNI",
          name: m.name,
          phone: null,
          nik: null,
          familyStatus: m.relation,
          active: true,
          note: `SUMBER:WARGA_FORM;RELASI:${m.relation}`,
          createdBy: memberCreatedBy,
        })),
      });
    }
  });

  revalidatePath("/resident/form");
  revalidatePath("/profil");
  revalidatePath("/admin/warga");
  revalidatePath(`/admin/warga/${selectedHouseId}`);
  return { ok: true, message: "Pengkinian data berhasil disimpan." };
}

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
