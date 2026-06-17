"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, signSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";
import { formatRupiah } from "@/lib/format";
import { saveUploadedFile, deleteStoredFile } from "@/lib/files";

const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export type LoginState = { error: string } | null;

export type ActionResult = { ok: true; message: string } | { ok: false; message: string };

export async function adminLogin(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!username || !password) {
    return { error: "Username dan kata sandi wajib diisi." };
  }

  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) return { error: "Username atau kata sandi salah." };

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) return { error: "Username atau kata sandi salah." };

  const token = await signSession({
    id: admin.id,
    username: admin.username,
    name: admin.name,
    role: admin.role,
  });

  const store = await cookies();
  store.set(ADMIN_COOKIE, token, ADMIN_COOKIE_OPTS);

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function adminLogout() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

/* --------------------------------- IPL ---------------------------------- */

export async function setIplAmount(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const amount = Number(formData.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount < 0)
    return { ok: false, message: "Nominal tidak valid." };
  await prisma.house.updateMany({ data: { iplAmount: amount } });
  void admin;
  revalidatePath("/admin/ipl");
  return { ok: true, message: `Nominal IPL disimpan: ${formatRupiah(amount)}.` };
}

export async function setIplAmountForHouses(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const amount = Number(formData.get("amount") ?? 0);
  const ids = String(formData.get("houseIds") ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);

  if (!Number.isFinite(amount) || amount < 0 || ids.length === 0)
    return { ok: false, message: "Pilih rumah & isi nominal yang valid." };

  await prisma.house.updateMany({
    where: { id: { in: ids } },
    data: { iplAmount: amount },
  });
  void admin;
  revalidatePath("/admin/ipl");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Nominal diterapkan ke ${ids.length} rumah.`,
  };
}

export async function generateBills(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const period = String(formData.get("period") ?? "").trim(); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(period))
    return { ok: false, message: "Periode tidak valid." };
  const [year, month] = period.split("-").map(Number);

  const houses = await prisma.house.findMany({ where: { payIpl: true } });

  for (const house of houses) {
    await prisma.bill.upsert({
      where: { houseId_year_month: { houseId: house.id, year, month } },
      update: {},
      create: {
        houseId: house.id,
        year,
        month,
        amount: house.iplAmount,
        status: "UNPAID",
        createdBy: admin.username,
      },
    });
  }
  revalidatePath("/admin/ipl");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `Tagihan diterbitkan untuk ${houses.length} rumah.`,
  };
}

export async function setCommunityFeeConfig(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const feeType = String(formData.get("feeType") ?? "").toUpperCase();
  const enabled = String(formData.get("enabled") ?? "on") === "on";
  const amount = Math.round(Number(formData.get("amount") ?? 0));

  if ((feeType !== "KAS" && feeType !== "PKK") || !Number.isFinite(amount) || amount < 0) {
    return { ok: false, message: "Jenis iuran atau nominal tidak valid." };
  }

  if (feeType === "KAS") {
    await prisma.house.updateMany({
      data: {
        payCash: enabled,
        cashAmount: amount,
      },
    });
  } else {
    await prisma.house.updateMany({
      data: {
        payPkk: enabled,
        pkkAmount: amount,
      },
    });
  }

  void admin;
  revalidatePath("/admin/pengaturan");
  revalidatePath("/admin/tunggakan-kas");
  revalidatePath("/admin/tunggakan-pkk");
  revalidatePath("/admin/sistag-kas");
  revalidatePath("/admin/sistag-pkk");
  revalidatePath("/admin/warga");

  return {
    ok: true,
    message: `${feeType} diperbarui: ${enabled ? "aktif" : "nonaktif"}, nominal ${formatRupiah(amount)}.`,
  };
}

/* ----------------------------- Transactions ----------------------------- */

export async function createTransaction(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const kind = String(formData.get("kind") ?? "KELUAR"); // MASUK | KELUAR
  const category = String(formData.get("category") ?? "UTAMA") === "PKK" ? "PKK" : "UTAMA";
  const type = String(formData.get("type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const author = String(formData.get("author") ?? "").trim() || admin.username;
  const amount = Math.round(Number(formData.get("amount") ?? 0));

  if (!type || !Number.isFinite(amount) || amount <= 0)
    return { ok: false, message: "Jenis & nominal transaksi wajib diisi." };

  const image = await saveUploadedFile(formData.get("imageFile"), {
    kind: "LAMPIRAN",
    createdBy: admin.username,
  });
  if (image && image.ok === false) return { ok: false, message: image.message };

  const mutation = kind === "MASUK" ? "DEBIT" : "KREDIT";
  const delta = mutation === "DEBIT" ? amount : -amount;

  await prisma.$transaction(async (tx) => {
    const trx = await tx.transaction.create({
      data: {
        category,
        type,
        notes,
        amount,
        mutation,
        image: image?.ok ? image.id : null,
        createdBy: author,
      },
    });

    const bal = await tx.balance.findFirst({ orderBy: { id: "asc" } });
    if (bal) {
      await tx.balance.update({
        where: { id: bal.id },
        data:
          category === "PKK"
            ? {
                balancePkk: { increment: delta },
                lastTxId: String(trx.id),
                updatedBy: author,
              }
            : {
                balance: { increment: delta },
                lastTxId: String(trx.id),
                updatedBy: author,
              },
      });
    }
  });

  revalidatePath("/admin/transaksi");
  revalidatePath("/admin");
  revalidatePath("/transaksi");
  revalidatePath("/");
  return {
    ok: true,
    message: `Transaksi ${kind === "MASUK" ? "pemasukan" : "pengeluaran"} dicatat: ${formatRupiah(amount)}.`,
  };
}

/* ------------------------------ Information ------------------------------ */

export async function saveInformation(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim() || null;
  const isPin = formData.get("isPin") === "on";
  const published = formData.get("published") === "on";
  if (!title || !content)
    return { ok: false, message: "Judul & isi wajib diisi." };

  if (id) {
    await prisma.information.update({
      where: { id },
      data: { title, content, image, isPin, published },
    });
  } else {
    await prisma.information.create({
      data: { title, content, image, isPin, published, createdBy: admin.username },
    });
  }
  revalidatePath("/admin/informasi");
  revalidatePath("/informasi");
  revalidatePath("/");
  return { ok: true, message: id ? "Informasi diperbarui." : "Informasi ditambahkan." };
}

export async function deleteInformation(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.information.delete({ where: { id } });
  revalidatePath("/admin/informasi");
  revalidatePath("/informasi");
  return { ok: true, message: "Informasi dihapus." };
}

/* -------------------------------- Banner -------------------------------- */

export async function saveBanner(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const image = String(formData.get("image") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!image) return { ok: false, message: "URL gambar wajib diisi." };

  if (id) {
    await prisma.banner.update({
      where: { id },
      data: { image, active },
    });
  } else {
    const count = await prisma.banner.count();
    await prisma.banner.create({
      data: { image, active, order: count + 1, createdBy: admin.username },
    });
  }
  revalidatePath("/admin/banner");
  revalidatePath("/");
  return { ok: true, message: id ? "Banner diperbarui." : "Banner ditambahkan." };
}

export async function deleteBanner(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.banner.delete({ where: { id } });
  revalidatePath("/admin/banner");
  revalidatePath("/");
  return { ok: true, message: "Banner dihapus." };
}

/* --------------------------------- House -------------------------------- */

export async function saveHouse(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const block = String(formData.get("block") ?? "").trim();
  const no = String(formData.get("no") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim() || null;
  const occupied = formData.get("occupied") === "on";
  const occupiedByOwner = formData.get("occupiedByOwner") === "on";
  const payIpl = formData.get("payIpl") === "on";
  const iplAmount = Number(formData.get("iplAmount") ?? 252000);
  if (!block || !no)
    return { ok: false, message: "Blok & nomor rumah wajib diisi." };

  const data = {
    block,
    no,
    ownerName,
    occupied,
    occupiedByOwner,
    payIpl,
    iplAmount: Number.isFinite(iplAmount) ? iplAmount : 252000,
  };
  if (id) {
    await prisma.house.update({ where: { id }, data });
  } else {
    await prisma.house.create({ data });
  }
  revalidatePath("/admin/warga");
  return { ok: true, message: id ? "Data rumah diperbarui." : "Rumah baru ditambahkan." };
}

export async function deleteHouse(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.house.delete({ where: { id } });
  revalidatePath("/admin/warga");
  return { ok: true, message: "Rumah dihapus." };
}

/* ------------------------------ Pengaduan ------------------------------- */

const COMPLAINT_STATUSES = ["BARU", "DIPROSES", "SELESAI"];

export async function updateComplaint(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (!id) return { ok: false, message: "Pengaduan tidak ditemukan." };

  const rawStatus = String(formData.get("status") ?? "").toUpperCase();
  const status = COMPLAINT_STATUSES.includes(rawStatus) ? rawStatus : "BARU";
  const reply = String(formData.get("reply") ?? "").trim() || null;

  await prisma.complaint.update({
    where: { id },
    data: {
      status,
      reply,
      repliedBy: reply ? admin.username : undefined,
    },
  });

  revalidatePath("/admin/pengaduan");
  revalidatePath("/admin");
  revalidatePath("/pengaduan");
  return { ok: true, message: "Pengaduan diperbarui." };
}

export async function deleteComplaint(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.complaint.delete({ where: { id } });
  revalidatePath("/admin/pengaduan");
  revalidatePath("/admin");
  return { ok: true, message: "Pengaduan dihapus." };
}

/* ------------------------- Pendataan Warga (KK/KTP) --------------------- */

export async function saveResident(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const houseId = Number(formData.get("houseId") ?? 0);
  const role = String(formData.get("role") ?? "PEMILIK") === "PENGHUNI" ? "PENGHUNI" : "PEMILIK";
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const nik = String(formData.get("nik") ?? "").trim() || null;
  const familyStatus = String(formData.get("familyStatus") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const active = formData.get("active") !== "off";

  if (!houseId || !name)
    return { ok: false, message: "Rumah & nama wajib diisi." };

  const ktp = await saveUploadedFile(formData.get("ktpFile"), {
    kind: "KTP",
    createdBy: admin.username,
  });
  if (ktp && ktp.ok === false) return { ok: false, message: ktp.message };
  const kk = await saveUploadedFile(formData.get("kkFile"), {
    kind: "KK",
    createdBy: admin.username,
  });
  if (kk && kk.ok === false) return { ok: false, message: kk.message };

  if (id) {
    const existing = await prisma.resident.findUnique({ where: { id } });
    if (ktp?.ok) await deleteStoredFile(existing?.ktpFileId);
    if (kk?.ok) await deleteStoredFile(existing?.kkFileId);
    await prisma.resident.update({
      where: { id },
      data: {
        houseId,
        role,
        name,
        phone,
        nik,
        familyStatus,
        note,
        active,
        ...(ktp?.ok ? { ktpFileId: ktp.id } : {}),
        ...(kk?.ok ? { kkFileId: kk.id } : {}),
      },
    });
  } else {
    await prisma.resident.create({
      data: {
        houseId,
        role,
        name,
        phone,
        nik,
        familyStatus,
        note,
        active,
        ktpFileId: ktp?.ok ? ktp.id : null,
        kkFileId: kk?.ok ? kk.id : null,
        createdBy: admin.username,
      },
    });
  }
  revalidatePath("/admin/warga");
  revalidatePath(`/admin/warga/${houseId}`);
  return { ok: true, message: id ? "Data warga diperbarui." : "Data warga ditambahkan." };
}

export async function deleteResident(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (!id) return { ok: false, message: "Data tidak ditemukan." };
  const existing = await prisma.resident.findUnique({ where: { id } });
  await deleteStoredFile(existing?.ktpFileId);
  await deleteStoredFile(existing?.kkFileId);
  await prisma.resident.delete({ where: { id } });
  revalidatePath("/admin/warga");
  if (existing) revalidatePath(`/admin/warga/${existing.houseId}`);
  return { ok: true, message: "Data warga dihapus." };
}

/* -------------------------------- Arsip --------------------------------- */

const ARCHIVE_CATEGORIES = ["LAPORAN", "NOTULEN", "SK", "UMUM"];

export async function saveArchive(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const rawCat = String(formData.get("category") ?? "UMUM").toUpperCase();
  const category = ARCHIVE_CATEGORIES.includes(rawCat) ? rawCat : "UMUM";
  if (!title) return { ok: false, message: "Judul dokumen wajib diisi." };

  const file = await saveUploadedFile(formData.get("file"), {
    kind: "ARSIP",
    createdBy: admin.username,
  });
  if (!file) return { ok: false, message: "File dokumen wajib diunggah." };
  if (file.ok === false) return { ok: false, message: file.message };

  await prisma.archive.create({
    data: { title, category, fileId: file.id, createdBy: admin.username },
  });
  revalidatePath("/admin/arsip");
  return { ok: true, message: "Dokumen arsip ditambahkan." };
}

export async function deleteArchive(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return { ok: false, message: "Dokumen tidak ditemukan." };
  const existing = await prisma.archive.findUnique({ where: { id } });
  await deleteStoredFile(existing?.fileId);
  await prisma.archive.delete({ where: { id } });
  revalidatePath("/admin/arsip");
  return { ok: true, message: "Dokumen arsip dihapus." };
}

/* -------------------------------- Surat --------------------------------- */

const LETTER_STATUSES = ["OPEN", "DIPROSES", "SELESAI", "DITOLAK"];

export async function updateLetter(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (!id) return { ok: false, message: "Pengajuan tidak ditemukan." };

  const rawStatus = String(formData.get("status") ?? "").toUpperCase();
  const status = LETTER_STATUSES.includes(rawStatus) ? rawStatus : "OPEN";
  const note = String(formData.get("note") ?? "").trim() || null;

  const result = await saveUploadedFile(formData.get("resultFile"), {
    kind: "LAMPIRAN",
    createdBy: admin.username,
  });
  if (result && result.ok === false)
    return { ok: false, message: result.message };

  if (result?.ok) {
    const existing = await prisma.letterRequest.findUnique({ where: { id } });
    await deleteStoredFile(existing?.resultFileId);
  }

  await prisma.letterRequest.update({
    where: { id },
    data: {
      status,
      note,
      handledBy: admin.username,
      ...(result?.ok ? { resultFileId: result.id } : {}),
    },
  });
  revalidatePath("/admin/surat");
  revalidatePath("/admin");
  revalidatePath("/surat");
  return { ok: true, message: "Pengajuan surat diperbarui." };
}

export async function deleteLetter(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (!id) return { ok: false, message: "Pengajuan tidak ditemukan." };
  const existing = await prisma.letterRequest.findUnique({ where: { id } });
  await deleteStoredFile(existing?.resultFileId);
  await prisma.letterRequest.delete({ where: { id } });
  revalidatePath("/admin/surat");
  revalidatePath("/admin");
  return { ok: true, message: "Pengajuan surat dihapus." };
}

/* --------------------------------- Vote --------------------------------- */

export async function saveVote(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const question = String(formData.get("question") ?? "").trim();
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const closesRaw = String(formData.get("closesAt") ?? "").trim();
  const closesAt = closesRaw ? new Date(closesRaw) : null;
  const options = String(formData.get("options") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!question) return { ok: false, message: "Pertanyaan voting wajib diisi." };

  if (id) {
    // edit: hanya ubah pertanyaan/detail/closesAt (opsi tetap, hindari hapus suara)
    await prisma.vote.update({
      where: { id },
      data: { question, detail, closesAt },
    });
    revalidatePath("/admin/vote");
    revalidatePath("/vote");
    return { ok: true, message: "Voting diperbarui." };
  }

  if (options.length < 2)
    return { ok: false, message: "Minimal 2 opsi (satu per baris)." };

  await prisma.vote.create({
    data: {
      question,
      detail,
      closesAt,
      createdBy: admin.username,
      options: {
        create: options.map((label, i) => ({ label, order: i })),
      },
    },
  });
  revalidatePath("/admin/vote");
  revalidatePath("/vote");
  return { ok: true, message: "Voting dibuat." };
}

export async function toggleVote(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (!id) return { ok: false, message: "Voting tidak ditemukan." };
  const vote = await prisma.vote.findUnique({ where: { id } });
  if (!vote) return { ok: false, message: "Voting tidak ditemukan." };
  await prisma.vote.update({ where: { id }, data: { active: !vote.active } });
  revalidatePath("/admin/vote");
  revalidatePath("/vote");
  return {
    ok: true,
    message: vote.active ? "Voting ditutup." : "Voting diaktifkan.",
  };
}

export async function deleteVote(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.vote.delete({ where: { id } });
  revalidatePath("/admin/vote");
  revalidatePath("/vote");
  return { ok: true, message: "Voting dihapus." };
}

/* ----------------------------- Kontribusi ------------------------------- */

export async function saveContribution(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const targetRaw = Number(formData.get("target") ?? 0);
  const target = Number.isFinite(targetRaw) && targetRaw > 0 ? Math.round(targetRaw) : null;
  const active = formData.get("active") !== "off";
  if (!title) return { ok: false, message: "Judul kontribusi wajib diisi." };

  if (id) {
    await prisma.contribution.update({
      where: { id },
      data: { title, description, target, active },
    });
  } else {
    await prisma.contribution.create({
      data: { title, description, target, active, createdBy: admin.username },
    });
  }
  revalidatePath("/admin/kontribusi");
  revalidatePath("/kontribusi");
  return { ok: true, message: id ? "Kontribusi diperbarui." : "Kontribusi dibuat." };
}

export async function deleteContribution(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.contribution.delete({ where: { id } });
  revalidatePath("/admin/kontribusi");
  revalidatePath("/kontribusi");
  return { ok: true, message: "Kontribusi dihapus." };
}

export async function addContributionEntry(
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const contributionId = String(formData.get("contributionId") ?? "");
  const donorName = String(formData.get("donorName") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const amount = Math.round(Number(formData.get("amount") ?? 0));
  if (!contributionId) return { ok: false, message: "Kontribusi tidak ditemukan." };
  if (!Number.isFinite(amount) || amount <= 0)
    return { ok: false, message: "Nominal tidak valid." };

  await prisma.contributionEntry.create({
    data: { contributionId, donorName, note, amount, createdBy: admin.username },
  });
  revalidatePath("/admin/kontribusi");
  revalidatePath("/kontribusi");
  return { ok: true, message: `Setoran dicatat: ${formatRupiah(amount)}.` };
}

export async function deleteContributionEntry(
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.contributionEntry.delete({ where: { id } });
  revalidatePath("/admin/kontribusi");
  revalidatePath("/kontribusi");
  return { ok: true, message: "Setoran dihapus." };
}


