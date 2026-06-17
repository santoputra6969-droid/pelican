"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { MONTHS, formatPeriod, formatRupiah, formatDateTime } from "@/lib/format";
import { printWithIOSClass } from "@/lib/printUtils";

type Row = {
  id: number;
  createdAt: string;
  category: string;
  type: string | null;
  notes: string | null;
  amount: number;
  mutation: string;
};

export function BukuKasReport({
  year,
  month,
  category,
  saldoAwal,
  totalMasuk,
  totalKeluar,
  rows,
}: {
  year: number;
  month: number;
  category: string;
  saldoAwal: number;
  totalMasuk: number;
  totalKeluar: number;
  rows: Row[];
}) {
  const router = useRouter();
  const saldoAkhir = saldoAwal + totalMasuk - totalKeluar;
  const categoryLabel =
    category === "SEMUA" ? "Semua Kas" : category === "PKK" ? "Kas PKK" : "Kas Utama";
  const printedAt = new Date();
  const [kopSrc, setKopSrc] = useState("/kop-surat.png");
  const [kopOk, setKopOk] = useState(true);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  function printPdf() {
    printWithIOSClass();
  }

  function apply(next: Partial<{ year: number; month: number; category: string }>) {
    const params = new URLSearchParams({
      year: String(next.year ?? year),
      month: String(next.month ?? month),
      category: next.category ?? category,
    });
    router.push(`/admin/bukukas?${params.toString()}`);
  }

  function exportCsv() {
    const header = ["Tanggal", "Kategori", "Jenis", "Keterangan", "Masuk", "Keluar"];
    const lines = rows.map((r) => {
      const masuk = r.mutation === "DEBIT" ? r.amount : 0;
      const keluar = r.mutation !== "DEBIT" ? r.amount : 0;
      return [
        formatDateTime(r.createdAt),
        r.category,
        r.type ?? "",
        (r.notes ?? "").replace(/[\r\n;,]/g, " "),
        masuk,
        keluar,
      ].join(";");
    });
    const summary = [
      "",
      `Saldo Awal;;;;${saldoAwal};`,
      `Total;;;;${totalMasuk};${totalKeluar}`,
      `Saldo Akhir;;;;${saldoAkhir};`,
    ];
    const csv = [header.join(";"), ...lines, ...summary].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `buku-kas-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="bukukas-report">
      {/* Filter periode */}
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4 print:hidden">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Tahun</label>
          <select
            value={year}
            onChange={(e) => apply({ year: Number(e.target.value) })}
            className="input"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Bulan</label>
          <select
            value={month}
            onChange={(e) => apply({ month: Number(e.target.value) })}
            className="input"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Kategori</label>
          <select
            value={category}
            onChange={(e) => apply({ category: e.target.value })}
            className="input"
          >
            <option value="SEMUA">Semua</option>
            <option value="UTAMA">Kas Utama</option>
            <option value="PKK">Kas PKK</option>
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={exportCsv} className="btn-ghost">
            <Icon name="receipt" size={18} />
            Excel
          </button>
          <button onClick={printPdf} className="btn-ghost">
            <Icon name="receipt" size={18} />
            PDF
          </button>
        </div>
      </div>

      {/* Judul cetak */}
      <div className="print-report mb-4">
        <div className="print-report__header print-only">
          {kopOk ? (
            <img
              src={kopSrc}
              alt="Kop Surat Cluster Puri Pelican"
              className="print-kop-image"
              onError={() => {
                if (kopSrc.endsWith(".png")) {
                  setKopSrc("/kop-surat.jpg");
                  return;
                }
                setKopOk(false);
              }}
            />
          ) : (
            <>
              <p className="print-report__org">PERUMAHAN PURI PELICAN</p>
              <p className="print-report__title">LAPORAN BUKU KAS</p>
              <p className="print-report__subtitle">Periode {formatPeriod(year, month)}</p>
            </>
          )}
        </div>

        <div className="print-report__meta print-only">
          <p>
            <span>Kategori</span>
            <strong>{categoryLabel}</strong>
          </p>
          <p>
            <span>Tanggal Cetak</span>
            <strong>{formatDateTime(printedAt)}</strong>
          </p>
        </div>

        <h2 className="text-lg font-bold text-ink screen-only">
          Buku Kas — {formatPeriod(year, month)}
        </h2>
        <p className="text-xs text-ink-soft screen-only">
          Kategori: {categoryLabel}
        </p>
      </div>

      {/* Ringkasan */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 print-summary-grid">
        <Summary label="Saldo Awal" value={saldoAwal} tone="ink" />
        <Summary label="Pemasukan" value={totalMasuk} tone="green" />
        <Summary label="Pengeluaran" value={totalKeluar} tone="red" />
        <Summary label="Saldo Akhir" value={saldoAkhir} tone="ink" strong />
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {rows.map((r) => {
          const masuk = r.mutation === "DEBIT";
          return (
            <div key={r.id} className="card overflow-hidden p-4">
              <div className="grid grid-cols-[1.1fr_1.6fr_0.7fr] gap-3 border-b border-black/5 pb-3 text-[11px] font-semibold text-ink-faint">
                <div>Tanggal</div>
                <div>Keterangan</div>
                <div className="text-right">Kategori</div>
              </div>

              <div className="grid grid-cols-[1.1fr_1.6fr_0.7fr] gap-3 py-3 text-sm">
                <div className="text-ink-soft whitespace-nowrap">{formatDateTime(r.createdAt)}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{r.type ?? "Transaksi"}</p>
                  {r.notes && <p className="mt-0.5 text-[11px] leading-snug text-ink-faint">{r.notes}</p>}
                </div>
                <div className="text-right text-xs font-medium text-ink-faint">{r.category}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-black/5 pt-3 text-sm">
                <div>
                  <p className="text-[11px] text-ink-faint">Uang Masuk</p>
                  <p className={`font-semibold ${masuk ? "text-pelican-700" : "text-ink-soft"}`}>
                    {masuk ? formatRupiah(r.amount) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-ink-faint">Uang Keluar</p>
                  <p className={`font-semibold ${!masuk ? "text-red-500" : "text-ink-soft"}`}>
                    {!masuk ? formatRupiah(r.amount) : "—"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-faint">
            Belum ada transaksi pada periode ini.
          </p>
        )}
      </div>

      {/* Tabel transaksi desktop */}
      <div className="card hidden overflow-hidden md:block print-table-wrap">
        <table className="w-full text-left text-sm print-table">
          <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
            <tr>
              <th className="px-4 py-3">Tanggal</th>
              <th className="px-4 py-3">Keterangan</th>
              <th className="px-4 py-3 text-center">Kategori</th>
              <th className="px-4 py-3 text-right">Masuk</th>
              <th className="px-4 py-3 text-right">Keluar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-ink-soft whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-ink">{r.type ?? "Transaksi"}</p>
                  {r.notes && <p className="text-[11px] text-ink-faint">{r.notes}</p>}
                </td>
                <td className="px-4 py-3 text-center text-xs text-ink-faint">{r.category}</td>
                <td className="px-4 py-3 text-right font-semibold text-pelican-700">
                  {r.mutation === "DEBIT" ? formatRupiah(r.amount) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-red-500">
                  {r.mutation !== "DEBIT" ? formatRupiah(r.amount) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-black/5 bg-black/[0.02] text-sm font-bold">
            <tr>
              <td className="px-4 py-3" colSpan={3}>
                Total
              </td>
              <td className="px-4 py-3 text-right text-pelican-700">
                {formatRupiah(totalMasuk)}
              </td>
              <td className="px-4 py-3 text-right text-red-500">
                {formatRupiah(totalKeluar)}
              </td>
            </tr>
          </tfoot>
        </table>
        {rows.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-faint">
            Belum ada transaksi pada periode ini.
          </p>
        )}
      </div>

      <div className="print-signatures print-only">
        <div className="print-signatures__item">
          <p>Dibuat oleh,</p>
          <div />
          <p>Admin / Bendahara</p>
        </div>
        <div className="print-signatures__item">
          <p>Mengetahui,</p>
          <div />
          <p>Ketua Pengelola</p>
        </div>
      </div>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
  strong,
}: {
  label: string;
  value: number;
  tone: "ink" | "green" | "red";
  strong?: boolean;
}) {
  const color =
    tone === "green" ? "text-pelican-700" : tone === "red" ? "text-red-500" : "text-ink";
  return (
    <div className="card p-4 print-summary-card">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className={`mt-1 ${strong ? "text-xl" : "text-lg"} font-extrabold ${color}`}>
        {formatRupiah(value)}
      </p>
    </div>
  );
}
