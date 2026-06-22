import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Menyajikan gambar banner publik (tampil di beranda warga). Hanya file
// dengan kind "banner" yang boleh diakses lewat route ini, sehingga dokumen
// sensitif (KTP/KK/arsip) tidak pernah ter-expose.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const file = await prisma.storedFile.findUnique({ where: { id } });
  if (!file || file.kind !== "banner") {
    return new NextResponse("Not found", { status: 404 });
  }

  const body = new Uint8Array(file.data);
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "image/jpeg",
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
