"use client";

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

  function exportCsv() {
    const header = ["Rumah", "Pemilik", "Jumlah Bulan", "Total Tunggakan", "Rincian"];
    const lines = rows.map((r) =>
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
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Filter Blok
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
        <div className="ml-auto flex gap-2">
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
          <p className="mt-1 text-2xl font-extrabold text-ink">{rows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Total Piutang</p>
          <p className="mt-1 text-2xl font-extrabold text-red-500">
            {formatRupiah(totalPiutang)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-ink">
        Daftar Tunggakan{selectedBlock !== "SEMUA" ? ` — ${selectedBlock}` : ""}
      </h2>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
            <tr>
              <th className="px-4 py-3">Rumah</th>
              <th className="px-4 py-3">Pemilik</th>
              <th className="px-4 py-3">Bulan</th>
              <th className="px-4 py-3 text-right">Total Tunggakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.id}>
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
              <td className="px-4 py-3" colSpan={3}>
                Total Piutang ({rows.length} rumah)
              </td>
              <td className="px-4 py-3 text-right text-red-500">
                {formatRupiah(totalPiutang)}
              </td>
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-faint">
            Tidak ada tunggakan. Semua rumah lunas. 🎉
          </p>
        )}
      </div>
    </div>
  );
}
