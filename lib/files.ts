import { prisma } from "./prisma";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

export type SaveFileResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Simpan file dari FormData ke Postgres (bytea). Tidak ada URL publik —
 * file hanya bisa diakses lewat /admin/files/[id] dengan sesi admin.
 * Mengembalikan id StoredFile, atau null bila tidak ada file dikirim.
 */
export async function saveUploadedFile(
  file: FormDataEntryValue | null,
  opts: { kind: string; createdBy?: string }
): Promise<SaveFileResult | null> {
  if (!file || typeof file === "string") return null;
  const f = file as File;
  if (!f.size) return null;

  if (f.size > MAX_FILE_BYTES) {
    return { ok: false, message: "Ukuran file maksimal 5 MB." };
  }
  if (f.type && !ALLOWED_MIME.includes(f.type)) {
    return { ok: false, message: "Format file harus JPG, PNG, WEBP, atau PDF." };
  }

  const buffer = Buffer.from(await f.arrayBuffer());
  const saved = await prisma.storedFile.create({
    data: {
      filename: f.name || "file",
      mimeType: f.type || "application/octet-stream",
      size: buffer.length,
      kind: opts.kind,
      data: buffer,
      createdBy: opts.createdBy ?? null,
    },
    select: { id: true },
  });
  return { ok: true, id: saved.id };
}

/** Hapus file tersimpan bila id ada. Aman dipanggil dengan null/undefined. */
export async function deleteStoredFile(id: string | null | undefined) {
  if (!id) return;
  try {
    await prisma.storedFile.delete({ where: { id } });
  } catch {
    /* sudah terhapus / tidak ada */
  }
}
