import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const house = await getSelectedHouse();
  if (!house) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Hanya izinkan file yang benar-benar terdaftar sebagai arsip dokumen.
  const usedByArchive = await prisma.archive.findFirst({
    where: { fileId: id },
    select: { id: true },
  });
  if (!usedByArchive) {
    return new NextResponse("Not found", { status: 404 });
  }

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
