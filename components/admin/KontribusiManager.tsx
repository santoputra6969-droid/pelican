"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { ActionForm } from "./ActionForm";
import {
  addContributionEntry,
  deleteContribution,
  deleteContributionEntry,
  saveContribution,
} from "@/app/admin/actions";
import { formatDateTime, formatRupiah } from "@/lib/format";

type Entry = {
  id: string;
  donorName: string | null;
  amount: number;
  note: string | null;
  createdAt: string;
};
type Contribution = {
  id: string;
  title: string;
  description: string | null;
  target: number | null;
  active: boolean;
  collected: number;
  entries: Entry[];
};

export function KontribusiManager({
  contributions,
}: {
  contributions: Contribution[];
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contribution | null>(null);
  const [entryFor, setEntryFor] = useState<Contribution | null>(null);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex justify-start sm:justify-end">
        <button onClick={openAdd} className="btn-primary w-full sm:w-auto">
          <Icon name="plus" size={18} />
          Tambah Kontribusi
        </button>
      </div>

      {contributions.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Belum ada kontribusi.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {contributions.map((c) => {
            const pct = c.target
              ? Math.min(100, Math.round((c.collected / c.target) * 100))
              : null;
            return (
              <div key={c.id} className="card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                          c.active
                            ? "bg-pelican-50 text-pelican-700"
                            : "bg-black/5 text-ink-faint"
                        }`}
                      >
                        {c.active ? "Aktif" : "Tutup"}
                      </span>
                    </div>
                    <p className="mt-2 font-bold text-ink">{c.title}</p>
                    {c.description && (
                      <p className="text-xs text-ink-soft">{c.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-black/5"
                      aria-label="Edit"
                    >
                      <Icon name="user-edit" size={16} />
                    </button>
                    <ActionForm action={deleteContribution}>
                      <input type="hidden" name="id" value={c.id} />
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

                <div className="mt-3">
                  <div className="flex items-end justify-between">
                    <p className="text-lg font-extrabold text-pelican-700">
                      {formatRupiah(c.collected)}
                    </p>
                    {c.target && (
                      <p className="text-[11px] text-ink-faint">
                        dari {formatRupiah(c.target)}
                      </p>
                    )}
                  </div>
                  {pct != null && (
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/5">
                      <div
                        className="h-full rounded-full bg-pelican-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>

                  <button
                  onClick={() => setEntryFor(c)}
                  className="btn-ghost mt-3 w-full !py-2.5 text-xs"
                >
                  <Icon name="plus" size={15} />
                  Catat Setoran ({c.entries.length})
                </button>

                {c.entries.length > 0 && (
                  <div className="mt-3 max-h-44 space-y-1.5 overflow-y-auto">
                    {c.entries.map((e) => (
                      <div
                        key={e.id}
                        className="flex items-center gap-2 rounded-xl bg-black/[0.02] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-ink">
                            {e.donorName ?? "Anonim"}
                          </p>
                          <p className="text-[10px] text-ink-faint">
                            {formatDateTime(e.createdAt)}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-pelican-700">
                          {formatRupiah(e.amount)}
                        </span>
                        <ActionForm action={deleteContributionEntry}>
                          <input type="hidden" name="id" value={e.id} />
                          <button
                            type="submit"
                            className="text-red-300 transition hover:text-red-500"
                            aria-label="Hapus setoran"
                          >
                            <Icon name="plus" size={14} className="rotate-45" />
                          </button>
                        </ActionForm>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form kontribusi */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit Kontribusi" : "Tambah Kontribusi"}
      >
        <ActionForm
          action={saveContribution}
          onSuccess={() => setFormOpen(false)}
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
              placeholder="mis. Sumbangan 17 Agustus"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Deskripsi (opsional)
            </label>
            <textarea
              name="description"
              rows={2}
              defaultValue={editing?.description ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Target Dana (Rp, opsional)
            </label>
            <input
              name="target"
              type="number"
              min={0}
              defaultValue={editing?.target ?? ""}
              className="input"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4 accent-pelican-600"
            />
            Aktif
          </label>
          <input type="hidden" name="active" value="off" />
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>

      {/* Catat setoran */}
      <Modal
        open={!!entryFor}
        onClose={() => setEntryFor(null)}
        title="Catat Setoran"
      >
        {entryFor && (
          <ActionForm
            action={addContributionEntry}
            onSuccess={() => setEntryFor(null)}
            className="space-y-4"
          >
            <input type="hidden" name="contributionId" value={entryFor.id} />
            <p className="rounded-xl bg-black/[0.03] px-3 py-2 text-xs text-ink-soft">
              {entryFor.title}
            </p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Nama Penyumbang (opsional)
              </label>
              <input name="donorName" className="input" placeholder="mis. Blok PLC-1 No 5" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Nominal (Rp)
              </label>
              <input name="amount" type="number" min={0} required className="input" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Catatan (opsional)
              </label>
              <input name="note" className="input" />
            </div>
            <button type="submit" className="btn-primary w-full">
              Simpan Setoran
            </button>
          </ActionForm>
        )}
      </Modal>
    </div>
  );
}
