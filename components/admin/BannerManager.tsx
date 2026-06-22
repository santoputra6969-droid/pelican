"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { deleteBanner, saveBanner } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";

type Banner = {
  id: number;
  image: string;
  active: boolean;
};

export function BannerManager({ items }: { items: Banner[] }) {
  const [editing, setEditing] = useState<Banner | null>(null);
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState("");

  function openNew() {
    setEditing(null);
    setImage("");
    setOpen(true);
  }
  function openEdit(b: Banner) {
    setEditing(b);
    setImage(b.image);
    setOpen(true);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImage(URL.createObjectURL(file));
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-start sm:justify-end">
        <button onClick={openNew} className="btn-primary w-full sm:w-auto">
          <Icon name="plus" size={18} />
          Tambah Banner
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          Belum ada banner.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((b) => (
            <div key={b.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.image}
                alt="Banner"
                className="aspect-[16/9] w-full object-cover"
              />
              <div className="flex items-center gap-2 p-3">
                {!b.active && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    Nonaktif
                  </span>
                )}
                <div className="ml-auto flex gap-2">
                  <button
                      onClick={() => openEdit(b)}
                      className="btn-ghost w-full px-3 py-2 text-xs sm:w-auto"
                    >
                    <Icon name="user-edit" size={16} />
                    Edit
                  </button>
                  <ActionForm action={deleteBanner}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-500 sm:w-auto"
                    >
                      <Icon name="plus" size={16} className="rotate-45" />
                      Hapus
                    </button>
                  </ActionForm>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Banner" : "Tambah Banner"}
      >
        <ActionForm
          action={saveBanner}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />

          {/* Live preview */}
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt="Pratinjau"
              className="aspect-[16/9] w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center rounded-2xl bg-pelican-50 text-sm text-ink-faint">
              Pratinjau banner
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Gambar Banner
            </label>
            <input
              type="file"
              name="imageFile"
              accept="image/png,image/jpeg,image/webp"
              required={!editing}
              onChange={handleFileChange}
              className="block w-full text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-pelican-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-pelican-700 hover:file:bg-pelican-100"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              Format JPG, PNG, atau WEBP. Maksimal 5 MB.
              {editing ? " Kosongkan untuk tetap memakai gambar lama." : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="active"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4 accent-pelican-600"
            />
            Tampilkan di beranda
          </label>
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}
