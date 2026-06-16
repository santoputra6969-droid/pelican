"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatDateTime, formatRupiah } from "@/lib/format";

type Row = {
  id: number;
  category: string;
  type: string | null;
  notes: string | null;
  amount: number;
  mutation: string;
  createdBy: string | null;
  date: string;
};

export function AdminTransaksiTable({ transactions }: { transactions: Row[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return transactions.filter(
      (t) =>
        (t.type ?? "").toLowerCase().includes(q) ||
        (t.notes ?? "").toLowerCase().includes(q) ||
        (t.createdBy ?? "").toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [transactions, query]);

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-black/5 p-4">
        <div className="relative max-w-sm">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari tipe, catatan, petugas..."
            className="input pl-11"
          />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
            <tr>
              <th className="px-5 py-3">Transaksi</th>
              <th className="px-5 py-3">Kategori</th>
              <th className="px-5 py-3">Petugas</th>
              <th className="px-5 py-3">Waktu</th>
              <th className="px-5 py-3 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((t) => {
              const masuk = t.mutation === "DEBIT";
              return (
                <tr key={t.id} className="hover:bg-black/[0.015]">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-ink">
                      {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                    </p>
                    {t.notes && (
                      <p className="max-w-md truncate text-[11px] text-ink-faint">
                        {t.notes}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        t.category === "PKK"
                          ? "bg-violet-50 text-violet-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {t.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-ink-soft">
                    {t.createdBy ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-[12px] text-ink-soft">
                    {formatDateTime(t.date)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-bold ${
                      masuk ? "text-pelican-700" : "text-red-500"
                    }`}
                  >
                    {masuk ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="divide-y divide-black/5 md:hidden">
        {filtered.map((t) => {
          const masuk = t.mutation === "DEBIT";
          return (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                </p>
                <p className="truncate text-[11px] text-ink-faint">
                  {t.notes ?? t.category}
                </p>
              </div>
              <p
                className={`text-sm font-bold ${
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

      {filtered.length === 0 && (
        <p className="p-8 text-center text-sm text-ink-faint">
          Tidak ada transaksi.
        </p>
      )}
    </div>
  );
}
