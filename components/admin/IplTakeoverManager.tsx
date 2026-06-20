"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import {
  saveIplTakeover,
  deleteIplTakeover,
  recordTakeoverCash,
} from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";
import { formatRupiah } from "@/lib/format";

type Row = {
  houseId: number;
  block: string;
  no: string;
  ownerName: string | null;
  totalAmount: number;
  paid: number;
  pending: number;
  remaining: number;
  note: string | null;
};

type House = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
};

type HistoryItem = {
  id: number;
  amount: number;
  source: string;
  status: string;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
};

function SubmitButton({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? "btn-primary disabled:opacity-60"}
    >
      {pending ? "Memproses…" : label}
    </button>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function IplTakeoverManager({
  rows,
  houses,
  history,
}: {
  rows: Row[];
  houses: House[];
  history: Record<number, HistoryItem[]>;
}) {
  const [editHouseId, setEditHouseId] = useState<number | "">("");
  const [total, setTotal] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [openHistory, setOpenHistory] = useState<Set<number>>(new Set());
  const [openCash, setOpenCash] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          acc.total += r.totalAmount;
          acc.paid += r.paid;
          acc.remaining += r.remaining;
          return acc;
        },
        { total: 0, paid: 0, remaining: 0 }
      ),
    [rows]
  );

  const houseLabel = (h: House) =>
    `Blok ${h.block} No ${h.no}${h.ownerName ? ` — ${h.ownerName}` : ""}`;

  function startEdit(r: Row) {
    setEditHouseId(r.houseId);
    setTotal(String(r.totalAmount));
    setNote(r.note ?? "");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function resetForm() {
    setEditHouseId("");
    setTotal("");
    setNote("");
  }

  function toggle(set: Set<number>, setFn: (s: Set<number>) => void, id: number) {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFn(next);
  }

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs text-ink-soft">Total Tunggakan Lama</p>
          <p className="mt-1 text-lg font-extrabold text-ink">
            {formatRupiah(totals.total)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-soft">Sudah Terbayar</p>
          <p className="mt-1 text-lg font-extrabold text-emerald-600">
            {formatRupiah(totals.paid)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-soft">Sisa Belum Terbayar</p>
          <p className="mt-1 text-lg font-extrabold text-amber-600">
            {formatRupiah(totals.remaining)}
          </p>
        </div>
      </div>

      {/* Form tambah / ubah */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-ink">
          {editHouseId ? "Ubah Tunggakan Lama" : "Tambah Tunggakan Lama"}
        </h2>
        <p className="mt-1 text-xs text-ink-soft">
          Catat total tunggakan IPL khusus periode sebelum 2025. Tidak masuk ke
          perhitungan tunggakan berjalan.
        </p>

        <ActionForm
          action={saveIplTakeover}
          onSuccess={resetForm}
          className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-ink">
              Rumah
            </label>
            <select
              name="houseId"
              value={editHouseId}
              onChange={(e) =>
                setEditHouseId(e.target.value ? Number(e.target.value) : "")
              }
              required
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-pelican-400"
            >
              <option value="">— Pilih rumah —</option>
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {houseLabel(h)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Total Tunggakan (Rp)
            </label>
            <input
              name="totalAmount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1000}
              value={total}
              onChange={(e) => setTotal(e.target.value)}
              required
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-pelican-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Catatan (opsional)
            </label>
            <input
              name="note"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="mis. tunggakan Jan–Des 2024"
              className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm outline-none focus:border-pelican-400"
            />
          </div>

          <div className="flex gap-2 sm:col-span-2">
            <SubmitButton label={editHouseId ? "Simpan Perubahan" : "Simpan"} />
            {editHouseId && (
              <button
                type="button"
                onClick={resetForm}
                className="btn-ghost"
              >
                Batal
              </button>
            )}
          </div>
        </ActionForm>
      </div>

      {/* Daftar takeover */}
      <div className="card p-5">
        <h2 className="text-base font-bold text-ink">
          Daftar Rumah ({rows.length})
        </h2>

        {rows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-black/5 px-4 py-6 text-center text-sm text-ink-soft">
            Belum ada data tunggakan IPL lama.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {rows.map((r) => {
              const items = history[r.houseId] ?? [];
              const showHistory = openHistory.has(r.houseId);
              const showCash = openCash.has(r.houseId);
              const minCash = Math.min(50000, r.remaining);
              return (
                <div
                  key={r.houseId}
                  className="rounded-2xl border border-black/10 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        Blok {r.block} No {r.no}
                      </p>
                      <p className="text-xs text-ink-faint">
                        {r.ownerName ?? "—"}
                      </p>
                      {r.note && (
                        <p className="mt-1 text-[11px] text-ink-soft">
                          {r.note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="rounded-lg bg-pelican-50 px-3 py-1.5 text-xs font-semibold text-pelican-700 hover:bg-pelican-100"
                      >
                        Ubah
                      </button>
                      {r.remaining > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggle(openCash, setOpenCash, r.houseId)
                          }
                          className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Cicil Tunai
                        </button>
                      )}
                      {items.length > 0 && (
                        <button
                          type="button"
                          onClick={() =>
                            toggle(openHistory, setOpenHistory, r.houseId)
                          }
                          className="rounded-lg bg-black/5 px-3 py-1.5 text-xs font-semibold text-ink-soft hover:bg-black/10"
                        >
                          Riwayat ({items.length})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <Stat label="Total" value={r.totalAmount} />
                    <Stat label="Terbayar" value={r.paid} tone="emerald" />
                    <Stat label="Pending" value={r.pending} tone="blue" />
                    <Stat label="Sisa" value={r.remaining} tone="amber" />
                  </div>

                  {showCash && r.remaining > 0 && (
                    <ActionForm
                      action={recordTakeoverCash}
                      onSuccess={() => toggle(openCash, setOpenCash, r.houseId)}
                      className="mt-3 flex flex-wrap items-end gap-2 rounded-xl bg-emerald-50/60 p-3"
                    >
                      <input type="hidden" name="houseId" value={r.houseId} />
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] font-semibold text-ink">
                          Nominal Cicilan Tunai (min {formatRupiah(minCash)})
                        </label>
                        <input
                          name="amount"
                          type="number"
                          inputMode="numeric"
                          min={minCash}
                          max={r.remaining}
                          step={1000}
                          defaultValue={minCash}
                          required
                          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="mb-1 block text-[11px] font-semibold text-ink">
                          Penyetor (opsional)
                        </label>
                        <input
                          name="author"
                          type="text"
                          placeholder="nama warga/penyetor"
                          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                        />
                      </div>
                      <SubmitButton
                        label="Catat ke Pending"
                        className="btn-primary disabled:opacity-60"
                      />
                    </ActionForm>
                  )}

                  {showHistory && items.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-black/10">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-black/5 text-ink-soft">
                          <tr>
                            <th className="px-3 py-2 font-semibold">Tanggal</th>
                            <th className="px-3 py-2 font-semibold">Nominal</th>
                            <th className="px-3 py-2 font-semibold">Sumber</th>
                            <th className="px-3 py-2 font-semibold">Status</th>
                            <th className="px-3 py-2 font-semibold">Oleh</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((it) => (
                            <tr key={it.id} className="border-t border-black/5">
                              <td className="px-3 py-2">
                                {formatDate(it.createdAt)}
                              </td>
                              <td className="px-3 py-2 font-semibold text-ink">
                                {formatRupiah(it.amount)}
                              </td>
                              <td className="px-3 py-2">
                                {it.source === "MIDTRANS" ? "Online" : "Tunai"}
                              </td>
                              <td className="px-3 py-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    it.status === "POSTED"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-amber-100 text-amber-700"
                                  }`}
                                >
                                  {it.status === "POSTED" ? "Lunas" : "Pending"}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-ink-faint">
                                {it.createdBy ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {r.paid === 0 && (
                    <div className="mt-3 flex justify-end">
                      {confirmDelete === r.houseId ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ink-soft">
                            Hapus data ini?
                          </span>
                          <ActionForm
                            action={deleteIplTakeover}
                            onSuccess={() => setConfirmDelete(null)}
                          >
                            <input
                              type="hidden"
                              name="houseId"
                              value={r.houseId}
                            />
                            <SubmitButton
                              label="Ya, Hapus"
                              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-60"
                            />
                          </ActionForm>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(null)}
                            className="text-xs font-semibold text-ink-soft"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(r.houseId)}
                          className="text-xs font-semibold text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number;
  tone?: "ink" | "emerald" | "amber" | "blue";
}) {
  const color =
    tone === "emerald"
      ? "text-emerald-600"
      : tone === "amber"
        ? "text-amber-600"
        : tone === "blue"
          ? "text-blue-600"
          : "text-ink";
  return (
    <div className="rounded-xl bg-black/5 p-2.5 text-center">
      <p className="text-[10px] text-ink-faint">{label}</p>
      <p className={`text-sm font-extrabold ${color}`}>{formatRupiah(value)}</p>
    </div>
  );
}
