"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { deleteBanner, saveBanner } from "@/app/admin/actions";

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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openNew} className="btn-primary">
          <Icon name="plus" size={18} />
          Tambah Banner
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          Belum ada banner.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
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
                    className="btn-ghost px-3 py-2 text-xs"
                  >
                    <Icon name="user-edit" size={16} />
                    Edit
                  </button>
                  <form action={deleteBanner}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 rounded-2xl border border-red-100 px-3 py-2 text-xs font-semibold text-red-500"
                    >
                      <Icon name="plus" size={16} className="rotate-45" />
                      Hapus
                    </button>
                  </form>
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
        <form
          action={async (formData) => {
            await saveBanner(formData);
            setOpen(false);
          }}
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
              URL Gambar Banner
            </label>
            <input
              name="image"
              required
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="input"
            />
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
        </form>
      </Modal>
    </div>
  );
}
