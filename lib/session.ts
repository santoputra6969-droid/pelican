import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession, type AdminSession } from "./auth";
import { prisma } from "./prisma";

export const HOUSE_COOKIE = "pelican_house";

export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  const token = store.get(ADMIN_COOKIE)?.value;
  return verifySession(token);
}

export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

export async function getSelectedHouseId(): Promise<string | null> {
  const store = await cookies();
  return store.get(HOUSE_COOKIE)?.value ?? null;
}

export async function getSelectedHouse() {
  const id = await getSelectedHouseId();
  if (!id) return null;
  const houseId = Number(id);
  if (!Number.isFinite(houseId)) return null;
  const house = await prisma.house.findUnique({ where: { id: houseId } });
  return house;
}
