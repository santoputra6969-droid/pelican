"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatDateTime } from "@/lib/format";
import { updateComplaint, deleteComplaint } from "@/app/admin/actions";

type Row = {
  id: number;
  houseLabel: string | null;
  ownerName: string | null;
  category: string;
  message: string;
  status: string;
  reply: string | null;
  repliedBy: string | null;
  date: string;
};

const STATUS_STYLE: Record<string, string> = {
  BARU: "bg-amber-50 text-amber-600",
  DIPROSES: "bg-sky-50 text-sky-600",
  SELESAI: "bg-pelican-50 text-pelican-700",
};

const FILTERS = [
  { id: "ALL", label: "Semua" },
  { id: "BARU", label: "Baru" },
  { id: "DIPROSES", label: "Diproses" },
  { id: "SELESAI", label: "Selesai" },
];

export function AdminPengaduanTable({ complaints }: { complaints: Row[] }) {
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return complaints.filter((c) => {
      const matchStatus = filter === "ALL" || c.status === filter;
      const matchQuery =
        c.message.toLowerCase().includes(q) ||
        (c.houseLabel ?? "").toLowerCase().includes(q) ||
        (c.ownerName ?? "").toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [complaints, filter, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.id
                  ? "bg-pelican-600 text-white"
                  : "bg-black/[0.04] text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari pengaduan..."
            className="input pl-11"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Tidak ada pengaduan.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((c) => (
            <div key={c.id} className="card flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-black/[0.04] px-2.5 py-0.5 text-[11px] font-bold text-ink-soft">
                  {c.category}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    STATUS_STYLE[c.status] ?? "bg-slate-100 text-slate-500"
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <p className="mt-2 text-sm text-ink">{c.message}</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-faint">
                <span className="font-semibold text-ink-soft">
                  {c.houseLabel ?? "Rumah tidak diketahui"}
                </span>
                {c.ownerName && <span>{c.ownerName}</span>}
                <span>{formatDateTime(c.date)}</span>
              </div>

              <form
                action={updateComplaint}
                className="mt-3 space-y-2 border-t border-black/5 pt-3"
              >
                <input type="hidden" name="id" value={c.id} />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-ink-soft">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={c.status}
                    className="input flex-1 px-3 py-2 text-sm"
                  >
                    <option value="BARU">Baru</option>
                    <option value="DIPROSES">Diproses</option>
                    <option value="SELESAI">Selesai</option>
                  </select>
                </div>
                <textarea
                  name="reply"
                  rows={2}
                  defaultValue={c.reply ?? ""}
                  placeholder="Tulis tanggapan untuk warga (opsional)..."
                  className="input resize-none text-sm"
                />
                <div className="flex items-center gap-2">
                  <button type="submit" className="btn-primary flex-1 py-2 text-sm">
                    <Icon name="check" size={16} />
                    Simpan
                  </button>
                </div>
              </form>

              <form action={deleteComplaint} className="mt-2">
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-red-50 py-2 text-xs font-semibold text-red-500 transition hover:bg-red-100"
                >
                  Hapus pengaduan
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
