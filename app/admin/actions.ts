"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, signSession } from "@/lib/auth";
import { requireAdmin } from "@/lib/session";

const ADMIN_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
};

export type LoginState = { error: string } | null;

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

export async function setIplAmount(formData: FormData) {
  const admin = await requireAdmin();
  const amount = Number(formData.get("amount") ?? 0);
  if (!Number.isFinite(amount) || amount < 0) return;
  await prisma.house.updateMany({ data: { iplAmount: amount } });
  void admin;
  revalidatePath("/admin/ipl");
}

export async function generateBills(formData: FormData) {
  const admin = await requireAdmin();
  const period = String(formData.get("period") ?? "").trim(); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(period)) return;
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
}

/* ----------------------------- Transactions ----------------------------- */

export async function createTransaction(formData: FormData) {
  const admin = await requireAdmin();
  const kind = String(formData.get("kind") ?? "KELUAR"); // MASUK | KELUAR
  const category = String(formData.get("category") ?? "UTAMA") === "PKK" ? "PKK" : "UTAMA";
  const type = String(formData.get("type") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const amount = Math.round(Number(formData.get("amount") ?? 0));

  if (!type || !Number.isFinite(amount) || amount <= 0) return;

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
        createdBy: admin.username,
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
                updatedBy: admin.username,
              }
            : {
                balance: { increment: delta },
                lastTxId: String(trx.id),
                updatedBy: admin.username,
              },
      });
    }
  });

  revalidatePath("/admin/transaksi");
  revalidatePath("/admin");
  revalidatePath("/transaksi");
  revalidatePath("/");
}

/* ------------------------------ Information ------------------------------ */

export async function saveInformation(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim() || null;
  const isPin = formData.get("isPin") === "on";
  const published = formData.get("published") === "on";
  if (!title || !content) return;

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
}

export async function deleteInformation(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (id) await prisma.information.delete({ where: { id } });
  revalidatePath("/admin/informasi");
  revalidatePath("/informasi");
}

/* -------------------------------- Banner -------------------------------- */

export async function saveBanner(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const image = String(formData.get("image") ?? "").trim();
  const active = formData.get("active") === "on";
  if (!image) return;

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
}

export async function deleteBanner(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.banner.delete({ where: { id } });
  revalidatePath("/admin/banner");
  revalidatePath("/");
}

/* --------------------------------- House -------------------------------- */

export async function saveHouse(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  const block = String(formData.get("block") ?? "").trim();
  const no = String(formData.get("no") ?? "").trim();
  const ownerName = String(formData.get("ownerName") ?? "").trim() || null;
  const occupied = formData.get("occupied") === "on";
  const occupiedByOwner = formData.get("occupiedByOwner") === "on";
  const payIpl = formData.get("payIpl") === "on";
  const iplAmount = Number(formData.get("iplAmount") ?? 252000);
  if (!block || !no) return;

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
}

export async function deleteHouse(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id") ?? 0);
  if (id) await prisma.house.delete({ where: { id } });
  revalidatePath("/admin/warga");
}
