import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Menyajikan file (KTP/KK/arsip/lampiran) yang tersimpan sebagai bytea di
// Postgres. WAJIB sesi admin — tidak ada URL publik, jadi dokumen sensitif
// (KTP/KK) tidak pernah ter-expose ke internet.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Length": String(file.size),
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
