"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { formatDateTime, formatRupiah } from "@/lib/format";

type TxLite = {
  id: number;
  category: string;
  type: string | null;
  notes: string | null;
  amount: number;
  mutation: string;
  createdBy: string | null;
  idSettlement: string | null;
  image: string | null;
  date: string;
};

const filters = [
  { id: "all", label: "Semua" },
  { id: "in", label: "Pemasukan" },
  { id: "out", label: "Pengeluaran" },
  { id: "PKK", label: "PKK" },
];

export function TransaksiList({ transactions }: { transactions: TxLite[] }) {
  const [active, setActive] = useState("all");
  const [type, setType] = useState("ALL");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [preview, setPreview] = useState<string | null>(null);

  const types = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) if (t.type) set.add(t.type);
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (active === "in" && t.mutation !== "DEBIT") return false;
      if (active === "out" && t.mutation !== "KREDIT") return false;
      if (active === "PKK" && t.category !== "PKK") return false;
      if (type !== "ALL" && t.type !== type) return false;
      if (start && t.date < start) return false;
      if (end && t.date.slice(0, 10) > end) return false;
      return true;
    });
  }, [active, type, start, end, transactions]);

  return (
    <>
      {/* Quick filters */}
      <section className="mt-5">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-5">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setActive(f.id)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                active === f.id
                  ? "bg-pelican-600 text-white shadow-glow"
                  : "bg-white text-ink-soft"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Advanced filters */}
      <section className="mt-3 px-5">
        <div className="card space-y-3 p-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-ink-soft">
              Tipe Transaksi
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="input appearance-none py-2.5 text-sm"
            >
              <option value="ALL">Semua Tipe</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label className="mb-1 block text-[11px] font-semibold text-ink-soft">
                Dari Tanggal
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="input min-w-0 appearance-none px-3 py-2.5 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label className="mb-1 block text-[11px] font-semibold text-ink-soft">
                Sampai Tanggal
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="input min-w-0 appearance-none px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          {(type !== "ALL" || start || end) && (
            <button
              onClick={() => {
                setType("ALL");
                setStart("");
                setEnd("");
              }}
              className="text-[11px] font-semibold text-pelican-600"
            >
              Reset filter
            </button>
          )}
        </div>
      </section>

      <section className="mt-4 px-5">
        <p className="mb-2 px-1 text-[11px] text-ink-faint">
          {filtered.length} transaksi
        </p>
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center gap-2 p-10 text-center">
            <Icon name="receipt" size={40} className="text-ink-faint" />
            <p className="text-sm font-semibold text-ink">Belum ada transaksi</p>
            <p className="text-xs text-ink-faint">
              Tidak ada transaksi sesuai filter ini.
            </p>
          </div>
        ) : (
          <div className="card max-h-[60vh] divide-y divide-black/5 overflow-y-auto">
            {filtered.map((t) => {
              const masuk = t.mutation === "DEBIT";
              return (
                <div key={t.id} className="flex items-start gap-3 p-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                      masuk
                        ? "bg-pelican-50 text-pelican-600"
                        : "bg-red-50 text-red-500"
                    }`}
                  >
                    <Icon
                      name="arrow-right"
                      size={20}
                      className={masuk ? "rotate-90" : "-rotate-90"}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                      {t.category === "PKK" && (
                        <span className="ml-1.5 rounded-full bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold text-violet-600">
                          PKK
                        </span>
                      )}
                    </p>
                    {t.notes && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-soft">
                        {t.notes}
                      </p>
                    )}
                    {t.idSettlement && (
                      <p className="mt-0.5 break-all font-mono text-[10px] text-ink-faint">
                        {t.idSettlement}
                      </p>
                    )}
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-faint">
                      <span>{formatDateTime(t.date)}</span>
                      {t.createdBy && <span>· dibuat oleh: {t.createdBy}</span>}
                      {t.image && (
                        <button
                          onClick={() => setPreview(t.image)}
                          className="font-semibold text-pelican-600"
                        >
                          Lihat Gambar
                        </button>
                      )}
                    </div>
                  </div>
                  <p
                    className={`shrink-0 text-sm font-bold ${
                      masuk ? "text-pelican-700" : "text-red-500"
                    }`}
                  >
                    {masuk ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Image preview */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-center justify-center bg-black/70 p-5 backdrop-blur-sm"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Bukti transaksi"
            className="max-h-[80vh] w-full rounded-2xl object-contain"
          />
          <button
            onClick={() => setPreview(null)}
            className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink"
            aria-label="Tutup"
          >
            <Icon name="plus" size={20} className="rotate-45" />
          </button>
        </div>
      )}
    </>
  );
}

