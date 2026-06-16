"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { deleteInformation, saveInformation } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";
import { formatDate } from "@/lib/format";

type Info = {
  id: string;
  title: string;
  content: string;
  image: string | null;
  isPin: boolean;
  published: boolean;
  date: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function InformasiManager({ items }: { items: Info[] }) {
  const [editing, setEditing] = useState<Info | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="btn-primary"
        >
          <Icon name="plus" size={18} />
          Tambah Informasi
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          Belum ada informasi.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((info) => (
            <article key={info.id} className="card p-5">
              <div className="flex items-center gap-2">
                {info.isPin && <span className="chip">Disematkan</span>}
                <span className="text-[11px] text-ink-faint">
                  {formatDate(info.date)}
                </span>
                {!info.published && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Draf
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-base font-bold text-ink">{info.title}</h3>
              <p className="mt-1 line-clamp-3 text-sm text-ink-soft">
                {stripHtml(info.content)}
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    setEditing(info);
                    setOpen(true);
                  }}
                  className="btn-ghost flex-1 py-2.5 text-xs"
                >
                  <Icon name="user-edit" size={16} />
                  Edit
                </button>
                <ActionForm action={deleteInformation}>
                  <input type="hidden" name="id" value={info.id} />
                  <button
                    type="submit"
                    className="flex h-full items-center gap-1.5 rounded-2xl border border-red-100 bg-white px-4 py-2.5 text-xs font-semibold text-red-500 transition active:scale-95"
                  >
                    <Icon name="plus" size={16} className="rotate-45" />
                    Hapus
                  </button>
                </ActionForm>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Informasi" : "Tambah Informasi"}
      >
        <ActionForm
          action={saveInformation}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Judul
            </label>
            <input
              name="title"
              required
              defaultValue={editing?.title ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Isi (boleh HTML sederhana)
            </label>
            <textarea
              name="content"
              required
              rows={5}
              defaultValue={editing?.content ?? ""}
              className="input resize-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              URL Gambar (opsional)
            </label>
            <input
              name="image"
              defaultValue={editing?.image ?? ""}
              placeholder="https://..."
              className="input"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isPin"
                defaultChecked={editing?.isPin ?? false}
                className="h-4 w-4 accent-pelican-600"
              />
              Sematkan di atas
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing?.published ?? true}
                className="h-4 w-4 accent-pelican-600"
              />
              Tampilkan ke warga
            </label>
          </div>
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}
