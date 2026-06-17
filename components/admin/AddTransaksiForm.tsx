"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { createTransaction } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";

type Kind = "KELUAR" | "MASUK";
type Category = "UTAMA" | "PKK";

export function AddTransaksiForm() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("KELUAR");
  const [category, setCategory] = useState<Category>("UTAMA");

  function openForm() {
    setKind("KELUAR");
    setCategory("UTAMA");
    setOpen(true);
  }

  return (
    <>
      <button onClick={openForm} className="btn-primary w-full sm:w-auto">
        <Icon name="plus" size={18} />
        Catat Transaksi
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Catat Transaksi">
        <ActionForm
          action={createTransaction}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="category" value={category} />

          {/* Jenis transaksi */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Jenis
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKind("KELUAR")}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  kind === "KELUAR"
                    ? "border-red-300 bg-red-50 text-red-600"
                    : "border-black/5 bg-white text-ink-soft"
                }`}
              >
                Pengeluaran
              </button>
              <button
                type="button"
                onClick={() => setKind("MASUK")}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  kind === "MASUK"
                    ? "border-pelican-300 bg-pelican-50 text-pelican-700"
                    : "border-black/5 bg-white text-ink-soft"
                }`}
              >
                Pemasukan
              </button>
            </div>
          </div>

          {/* Kategori kas */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Kas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCategory("UTAMA")}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  category === "UTAMA"
                    ? "border-pelican-300 bg-pelican-50 text-pelican-700"
                    : "border-black/5 bg-white text-ink-soft"
                }`}
              >
                Kas Utama
              </button>
              <button
                type="button"
                onClick={() => setCategory("PKK")}
                className={`rounded-2xl border px-3 py-2.5 text-sm font-semibold transition ${
                  category === "PKK"
                    ? "border-violet-300 bg-violet-50 text-violet-600"
                    : "border-black/5 bg-white text-ink-soft"
                }`}
              >
                Kas PKK
              </button>
            </div>
          </div>

          {/* Judul / tipe */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Judul
            </label>
            <input
              name="type"
              required
              placeholder="cth: Konsumsi Rapat, Gaji Security"
              className="input"
            />
          </div>

          {/* Nominal */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Nominal (Rp)
            </label>
            <input
              name="amount"
              type="number"
              min={1}
              required
              placeholder="0"
              className="input"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Catatan (opsional)
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Keterangan tambahan..."
              className="input resize-none"
            />
          </div>

          <SubmitButton kind={kind} />
        </ActionForm>
      </Modal>
    </>
  );
}

function SubmitButton({ kind }: { kind: Kind }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:opacity-60"
    >
      <Icon name="check" size={18} />
      {pending
        ? "Menyimpan..."
        : kind === "MASUK"
          ? "Simpan Pemasukan"
          : "Simpan Pengeluaran"}
    </button>
  );
}
