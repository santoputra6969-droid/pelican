"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { ActionForm } from "./ActionForm";
import { deleteLetter, updateLetter } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

type Letter = {
  id: number;
  houseLabel: string | null;
  applicant: string;
  phone: string | null;
  type: string;
  purpose: string;
  status: string;
  note: string | null;
  resultFileId: string | null;
  createdAt: string;
};

const TYPE_LABEL: Record<string, string> = {
  PENGANTAR: "Surat Pengantar",
  DOMISILI: "Surat Domisili",
  KETERANGAN: "Surat Keterangan",
  LAINNYA: "Lainnya",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600",
  DIPROSES: "bg-sky-50 text-sky-600",
  SELESAI: "bg-pelican-50 text-pelican-700",
  DITOLAK: "bg-red-50 text-red-600",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Baru",
  DIPROSES: "Diproses",
  SELESAI: "Selesai",
  DITOLAK: "Ditolak",
};

export function SuratManager({ letters }: { letters: Letter[] }) {
  const [editing, setEditing] = useState<Letter | null>(null);

  return (
    <div>
      {letters.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Belum ada pengajuan surat.
        </div>
      ) : (
        <div className="space-y-3">
          {letters.map((l) => (
            <div key={l.id} className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="chip">{TYPE_LABEL[l.type] ?? l.type}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    STATUS_STYLE[l.status] ?? "bg-black/5 text-ink-soft"
                  }`}
                >
                  {STATUS_LABEL[l.status] ?? l.status}
                </span>
                <span className="ml-auto text-[11px] text-ink-faint">
                  {formatDateTime(l.createdAt)}
                </span>
              </div>

              <p className="mt-2 font-semibold text-ink">{l.applicant}</p>
              <p className="text-[11px] text-ink-faint">
                {l.houseLabel ?? "—"} {l.phone ? `• ${l.phone}` : ""}
              </p>
              <p className="mt-2 text-sm text-ink-soft">{l.purpose}</p>

              {l.note && (
                <p className="mt-2 rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-ink-soft">
                  <span className="font-semibold">Catatan admin:</span> {l.note}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {l.resultFileId && (
                  <a
                    href={`/admin/files/${l.resultFileId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg bg-pelican-50 px-2.5 py-1 text-[11px] font-semibold text-pelican-700 hover:bg-pelican-100"
                  >
                    Lihat Surat Jadi
                  </a>
                )}
                <div className="ml-auto flex gap-1.5">
                  <button
                    onClick={() => setEditing(l)}
                    className="btn-ghost !px-3 !py-2 text-xs"
                  >
                    <Icon name="user-edit" size={15} />
                    Proses
                  </button>
                  <ActionForm action={deleteLetter}>
                    <input type="hidden" name="id" value={l.id} />
                    <button
                      type="submit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50"
                      aria-label="Hapus"
                    >
                      <Icon name="plus" size={16} className="rotate-45" />
                    </button>
                  </ActionForm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Proses Pengajuan Surat"
      >
        {editing && (
          <ActionForm
            action={updateLetter}
            onSuccess={() => setEditing(null)}
            className="space-y-4"
          >
            <input type="hidden" name="id" value={editing.id} />
            <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-ink-soft">
              <p className="font-semibold text-ink">{editing.applicant}</p>
              <p>{editing.purpose}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Status
              </label>
              <select name="status" defaultValue={editing.status} className="input">
                <option value="OPEN">Baru</option>
                <option value="DIPROSES">Diproses</option>
                <option value="SELESAI">Selesai</option>
                <option value="DITOLAK">Ditolak</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Catatan Admin
              </label>
              <textarea
                name="note"
                rows={2}
                defaultValue={editing.note ?? ""}
                placeholder="Opsional"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Unggah Surat Jadi (PDF, opsional)
              </label>
              <input
                name="resultFile"
                type="file"
                accept="image/*,application/pdf"
                className="input-file"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              Simpan
            </button>
          </ActionForm>
        )}
      </Modal>
    </div>
  );
}
