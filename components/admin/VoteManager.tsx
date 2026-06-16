"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { ActionForm } from "./ActionForm";
import { deleteVote, saveVote, toggleVote } from "@/app/admin/actions";
import { formatDateTime } from "@/lib/format";

type Option = { id: number; label: string; count: number };
type Vote = {
  id: number;
  question: string;
  detail: string | null;
  active: boolean;
  closesAt: string | null;
  totalVotes: number;
  createdAt: string;
  options: Option[];
};

export function VoteManager({ votes }: { votes: Vote[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Vote | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={openAdd} className="btn-primary">
          <Icon name="plus" size={18} />
          Buat Voting
        </button>
      </div>

      {votes.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Belum ada voting.
        </div>
      ) : (
        <div className="space-y-4">
          {votes.map((v) => (
            <div key={v.id} className="card p-5">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        v.active
                          ? "bg-pelican-50 text-pelican-700"
                          : "bg-black/5 text-ink-faint"
                      }`}
                    >
                      {v.active ? "Aktif" : "Ditutup"}
                    </span>
                    <span className="text-[11px] text-ink-faint">
                      {v.totalVotes} suara
                    </span>
                  </div>
                  <p className="mt-2 font-bold text-ink">{v.question}</p>
                  {v.detail && (
                    <p className="text-xs text-ink-soft">{v.detail}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditing(v);
                      setOpen(true);
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-black/5"
                    aria-label="Edit"
                  >
                    <Icon name="user-edit" size={16} />
                  </button>
                  <ActionForm action={toggleVote}>
                    <input type="hidden" name="id" value={v.id} />
                    <button
                      type="submit"
                      className="flex h-8 items-center rounded-lg px-2 text-[11px] font-semibold text-ink-soft transition hover:bg-black/5"
                    >
                      {v.active ? "Tutup" : "Buka"}
                    </button>
                  </ActionForm>
                  <ActionForm action={deleteVote}>
                    <input type="hidden" name="id" value={v.id} />
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

              <div className="mt-3 space-y-2">
                {v.options.map((o) => {
                  const pct = v.totalVotes
                    ? Math.round((o.count / v.totalVotes) * 100)
                    : 0;
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="font-medium text-ink">{o.label}</span>
                        <span className="text-ink-faint">
                          {o.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-black/5">
                        <div
                          className="h-full rounded-full bg-pelican-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-3 text-[11px] text-ink-faint">
                Dibuat {formatDateTime(v.createdAt)}
                {v.closesAt ? ` • Ditutup ${formatDateTime(v.closesAt)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Voting" : "Buat Voting"}
      >
        <ActionForm
          action={saveVote}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Pertanyaan
            </label>
            <input
              name="question"
              required
              defaultValue={editing?.question ?? ""}
              className="input"
              placeholder="mis. Setuju iuran kebersihan naik?"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Keterangan (opsional)
            </label>
            <textarea
              name="detail"
              rows={2}
              defaultValue={editing?.detail ?? ""}
              className="input"
            />
          </div>
          {!editing && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Opsi Jawaban (satu per baris, minimal 2)
              </label>
              <textarea
                name="options"
                rows={4}
                required
                className="input"
                placeholder={"Setuju\nTidak Setuju\nAbstain"}
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Tutup pada (opsional)
            </label>
            <input
              name="closesAt"
              type="datetime-local"
              defaultValue={
                editing?.closesAt
                  ? editing.closesAt.slice(0, 16)
                  : ""
              }
              className="input"
            />
          </div>
          {editing && (
            <p className="text-[11px] text-ink-faint">
              Opsi jawaban tidak dapat diubah setelah voting dibuat agar suara
              yang masuk tetap valid.
            </p>
          )}
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}
