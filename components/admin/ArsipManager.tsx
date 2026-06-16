"use client";

import { useMemo, useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { ActionForm } from "./ActionForm";
import { deleteArchive, saveArchive } from "@/app/admin/actions";
import { formatDate } from "@/lib/format";

type Archive = {
  id: string;
  title: string;
  category: string;
  fileId: string;
  createdAt: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  LAPORAN: "Laporan",
  NOTULEN: "Notulen",
  SK: "SK",
  UMUM: "Umum",
};

export function ArsipManager({ archives }: { archives: Archive[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return archives.filter((a) => a.title.toLowerCase().includes(q));
  }, [archives, query]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari judul dokumen..."
            className="input pl-11"
          />
        </div>
        <button onClick={() => setOpen(true)} className="btn-primary">
          <Icon name="plus" size={18} />
          Tambah Arsip
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Belum ada dokumen arsip.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <div key={a.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="chip">{CATEGORY_LABEL[a.category] ?? a.category}</span>
                <ActionForm action={deleteArchive}>
                  <input type="hidden" name="id" value={a.id} />
                  <button
                    type="submit"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50"
                    aria-label="Hapus"
                  >
                    <Icon name="plus" size={15} className="rotate-45" />
                  </button>
                </ActionForm>
              </div>
              <p className="mt-2 line-clamp-2 font-semibold text-ink">{a.title}</p>
              <p className="mt-1 text-[11px] text-ink-faint">{formatDate(a.createdAt)}</p>
              <a
                href={`/admin/files/${a.fileId}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-3 w-full !py-2.5 text-xs"
              >
                <Icon name="receipt" size={16} />
                Buka Dokumen
              </a>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Tambah Arsip Dokumen">
        <ActionForm
          action={saveArchive}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Judul Dokumen
            </label>
            <input
              name="title"
              required
              placeholder="mis. Laporan Keuangan April 2026"
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Kategori
            </label>
            <select name="category" defaultValue="LAPORAN" className="input">
              <option value="LAPORAN">Laporan</option>
              <option value="NOTULEN">Notulen</option>
              <option value="SK">SK</option>
              <option value="UMUM">Umum</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              File (PDF / gambar, maks 5 MB)
            </label>
            <input
              name="file"
              type="file"
              required
              accept="image/*,application/pdf"
              className="input-file"
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}
