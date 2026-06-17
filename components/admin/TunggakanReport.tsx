"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatPeriod, formatRupiah } from "@/lib/format";

type Row = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
  months: number;
  total: number;
  bills: { year: number; month: number; amount: number }[];
};

export function TunggakanReport({
  rows,
  blocks,
  selectedBlock,
  totalPiutang,
}: {
  rows: Row[];
  blocks: string[];
  selectedBlock: string;
  totalPiutang: number;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>(rows.map((r) => r.id));
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds(rows.map((r) => r.id));
    setExpandedIds([]);
  }, [rows]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );
  const selectedTotal = selectedRows.reduce((s, r) => s + r.total, 0);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  function toggleRow(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleExpand(id: number) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(rows.map((r) => r.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  function exportCsv() {
    const header = ["Rumah", "Pemilik", "Jumlah Bulan", "Total Tunggakan", "Rincian"];
    const lines = selectedRows.map((r) =>
      [
        `${r.block} No ${r.no}`,
        r.ownerName ?? "",
        r.months,
        r.total,
        r.bills.map((b) => formatPeriod(b.year, b.month)).join(" | "),
      ].join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tunggakan-ipl-${selectedBlock.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Filter & aksi */}
      <div className="card mb-4 space-y-4 p-4 print:hidden">
        <div className="max-w-sm">
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Filter Berdasarkan Blok
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => router.push(`/admin/tunggakan?block=${e.target.value}`)}
            className="input"
          >
            <option value="SEMUA">Semua Blok</option>
            {blocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="rounded-lg border border-black/20 bg-white px-3 py-2 text-sm font-semibold text-ink-soft"
          >
            PILIH SEMUA
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="rounded-lg border border-black/20 bg-black/5 px-3 py-2 text-sm font-semibold text-ink-faint"
          >
            BATAL PILIH SEMUA
          </button>
          <p className="self-center text-sm text-ink-soft">
            ({selectedIds.length} dari {rows.length} dipilih)
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={exportCsv} className="btn-ghost">
            <Icon name="receipt" size={18} />
            Excel
          </button>
          <button onClick={() => window.print()} className="btn-ghost">
            <Icon name="receipt" size={18} />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Rumah Menunggak</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{selectedRows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Total Piutang</p>
          <p className="mt-1 text-2xl font-extrabold text-red-500">
            {formatRupiah(selectedTotal)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-ink">
        Daftar Tunggakan{selectedBlock !== "SEMUA" ? ` — ${selectedBlock}` : ""}
      </h2>

      <div className="space-y-3 md:hidden">
        {selectedRows.map((r) => (
          <div
            key={`mobile-${r.id}`}
            className={`card w-full p-4 text-left transition ${
              selectedIds.includes(r.id) ? "ring-1 ring-pelican-500" : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  selectedIds.includes(r.id)
                    ? "border-pelican-500 bg-pelican-500 text-white"
                    : "border-black/20"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(r.id)}
                  onChange={() => toggleRow(r.id)}
                  className="h-4 w-4 accent-pelican-600"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-extrabold text-ink">
                  {r.block} No {r.no}
                </p>
                <p className="text-base text-ink-soft">{r.ownerName ?? "Belum pengkinian data"}</p>
                <p className="mt-1 text-lg font-bold text-red-500">
                  {r.months} bulan - {formatRupiah(r.total)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleExpand(r.id)}
                className="rounded-md p-1 text-ink-faint"
                aria-label="Lihat detail bulan"
              >
                <Icon
                  name="chevron-right"
                  size={20}
                  className={expandedIds.includes(r.id) ? "rotate-90" : ""}
                />
              </button>
            </div>

            {expandedIds.includes(r.id) && (
              <div className="mt-4 space-y-2">
                {r.bills.map((b, idx) => (
                  <div
                    key={`${r.id}-${b.year}-${b.month}-${idx}`}
                    className="rounded-lg border border-black/10 bg-white p-3"
                  >
                    <p className="text-2xl font-semibold text-ink">
                      Bulan {b.month} Tahun {b.year}
                    </p>
                    <p className="text-lg text-ink-soft">
                      Nominal: <span className="font-semibold text-ink">{formatRupiah(b.amount)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden card md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
            <tr>
              <th className="px-4 py-3 w-12">Pilih</th>
              <th className="px-4 py-3">Rumah</th>
              <th className="px-4 py-3">Pemilik</th>
              <th className="px-4 py-3">Bulan</th>
              <th className="px-4 py-3 text-right">Total Tunggakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {selectedRows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(r.id)}
                    onChange={() => toggleRow(r.id)}
                    className="h-4 w-4 accent-pelican-600"
                  />
                </td>
                <td className="px-4 py-3 font-semibold text-ink whitespace-nowrap">
                  {r.block} No {r.no}
                </td>
                <td className="px-4 py-3 text-ink-soft">{r.ownerName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                    {r.months} bulan
                  </span>
                  <p className="mt-1 text-[10px] text-ink-faint">
                    {r.bills.map((b) => formatPeriod(b.year, b.month)).join(", ")}
                  </p>
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-500">
                  {formatRupiah(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-black/5 bg-black/[0.02] text-sm font-bold">
            <tr>
              <td className="px-4 py-3" colSpan={4}>
                Total Piutang ({selectedRows.length} rumah)
              </td>
              <td className="px-4 py-3 text-right text-red-500">
                {formatRupiah(selectedTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
        {selectedRows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-faint">
            Tidak ada tunggakan. Semua rumah lunas.
          </p>
        )}
      </div>

      {selectedRows.length === 0 && (
        <div className="card p-8 text-center text-sm text-ink-faint md:hidden">
          Tidak ada data terpilih.
        </div>
      )}
    </div>
  );
}
