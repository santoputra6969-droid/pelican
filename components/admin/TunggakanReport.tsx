"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { formatPeriod, formatRupiah } from "@/lib/format";
import { isIOSSafari } from "@/lib/printUtils";

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
  reportKind = "IPL",
  reportLabel = "Tunggakan IPL",
  filterBasePath = "/admin/tunggakan",
}: {
  rows: Row[];
  blocks: string[];
  selectedBlock: string;
  totalPiutang: number;
  reportKind?: "IPL" | "KAS" | "PKK";
  reportLabel?: string;
  filterBasePath?: string;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>(rows.map((r) => r.id));
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const [kopSrc, setKopSrc] = useState("/kop-surat.png");
  const [kopOk, setKopOk] = useState(true);

  useEffect(() => {
    setSelectedIds(rows.map((r) => r.id));
    setExpandedIds([]);
  }, [rows]);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedIds.includes(r.id)),
    [rows, selectedIds]
  );
  const selectedTotal = selectedRows.reduce((s, r) => s + r.total, 0);
  const totalNett = Math.round(selectedTotal * 0.993);
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;
  const printedAt = new Date().toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

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
    a.download = `${reportLabel.toLowerCase().replace(/\s+/g, "-")}-${selectedBlock.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function printViaTemplate() {
    const win = window.open("", "_blank");
    if (!win) {
      window.print();
      return;
    }

    const rowsHtml = selectedRows
      .map(
        (r, idx) => `
          <tr>
            <td class="c tc">${idx + 1}</td>
            <td class="c">${escapeHtml(`${r.block} No ${r.no}`)}</td>
            <td class="c">${escapeHtml(r.ownerName ?? "Belum pengkinian data")}</td>
            <td class="c nw">${r.months} bulan</td>
            <td class="c tr nw">${formatRupiah(r.total)}</td>
          </tr>
        `
      )
      .join("");

    const totalMonths = selectedRows.reduce((acc, r) => acc + r.months, 0);
    const titleBlock = selectedBlock === "SEMUA" ? "Semua" : selectedBlock;
    const kopUrl = `${window.location.origin}${kopSrc}`;

    const html = `
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>PDF Tunggakan IPL</title>
          <style>
            @page { size: A4; margin: 8mm; }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 11px;
            }
            .wrap {
              width: 100%;
            }
            .kop {
              width: 100%;
              display: block;
              border-bottom: 2px solid #111;
              padding-bottom: 5px;
              margin-bottom: 6px;
            }
            .title {
              text-align: center;
              font-size: 28px;
              font-weight: 700;
              line-height: 1.25;
              margin: 0;
            }
            .meta {
              text-align: center;
              font-size: 20px;
              margin: 2px 0 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #000;
              padding: 2px 4px;
              font-size: 10px;
              line-height: 1.2;
              vertical-align: middle;
              word-break: break-word;
            }
            thead th {
              background: #fde047;
              font-weight: 700;
            }
            tfoot tr:first-child td {
              background: #e5e7eb;
              font-weight: 700;
            }
            tfoot tr:last-child td {
              background: #86efac;
              font-weight: 700;
            }
            .c { text-align: left; }
            .tc { text-align: center; }
            .tr { text-align: right; }
            .nw { white-space: nowrap; }
            .col-no { width: 6%; }
            .col-rumah { width: 18%; }
            .col-nama { width: 34%; }
            .col-tunggakan { width: 16%; }
            .col-nominal { width: 26%; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img class="kop" src="${kopUrl}" alt="Kop Surat" />
            <p class="title">${escapeHtml(reportLabel)} Cluster Puri Pelican Blok ${escapeHtml(titleBlock)}</p>
            <p class="meta">Dicetak pada ${escapeHtml(printedAt)} WIB</p>

            <table>
              <thead>
                <tr>
                  <th class="col-no">No</th>
                  <th class="col-rumah">Blok &amp; No</th>
                  <th class="col-nama">Nama Penghuni</th>
                  <th class="col-tunggakan">Tunggakan</th>
                  <th class="col-nominal tr">Nominal</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3">TOTAL</td>
                  <td class="nw">${totalMonths} bulan</td>
                  <td class="tr nw">${formatRupiah(selectedTotal)}</td>
                </tr>
                <tr>
                  <td colspan="4">TOTAL NETT (-0.7%)</td>
                  <td class="tr nw">${formatRupiah(totalNett)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <script>
            window.addEventListener('load', function () {
              setTimeout(function () {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `;

    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function printPdf() {
    if (typeof window === "undefined") return;
    if (isIOSSafari()) {
      printViaTemplate();
      return;
    }
    window.print();
  }

  return (
    <div>
      <div className="print-report mb-4 print-only">
        <div className="print-report__header">
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
              <p className="print-report__title">LAPORAN {reportLabel.toUpperCase()}</p>
            </>
          )}
        </div>
      </div>

      <div className="hidden print:block">
        <p className="text-center text-lg font-bold text-black">
          {reportLabel} Cluster Puri Pelican Blok {selectedBlock === "SEMUA" ? "Semua" : selectedBlock}
        </p>
        <p className="mb-3 text-center text-xs text-black">Dicetak pada {printedAt} WIB</p>

        <table className="print-tunggakan-table w-full border-collapse text-left text-[11px] text-black">
          <thead>
            <tr className="bg-yellow-300">
              <th className="border border-black px-2 py-1 text-center">No</th>
              <th className="border border-black px-2 py-1">Blok &amp; No</th>
              <th className="border border-black px-2 py-1">Nama Penghuni</th>
              <th className="border border-black px-2 py-1">Tunggakan</th>
              <th className="border border-black px-2 py-1 text-right">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {selectedRows.map((r, index) => (
              <tr key={`print-row-${r.id}`}>
                <td className="border border-black px-2 py-1 text-center">{index + 1}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{r.block} No {r.no}</td>
                <td className="border border-black px-2 py-1">{r.ownerName ?? "Belum pengkinian data"}</td>
                <td className="border border-black px-2 py-1 whitespace-nowrap">{r.months} bulan</td>
                <td className="border border-black px-2 py-1 text-right whitespace-nowrap">{formatRupiah(r.total)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-black/10 font-bold">
              <td className="border border-black px-2 py-1" colSpan={3}>
                TOTAL
              </td>
              <td className="border border-black px-2 py-1">{selectedRows.reduce((acc, r) => acc + r.months, 0)} bulan</td>
              <td className="border border-black px-2 py-1 text-right">{formatRupiah(selectedTotal)}</td>
            </tr>
            <tr className="bg-green-300 font-bold">
              <td className="border border-black px-2 py-1" colSpan={4}>
                TOTAL NETT (-0.7%)
              </td>
              <td className="border border-black px-2 py-1 text-right">{formatRupiah(totalNett)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Filter & aksi */}
      <div className="card mb-4 space-y-4 p-4 print:hidden">
        <div className="max-w-sm">
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Filter Berdasarkan Blok
          </label>
          <select
            value={selectedBlock}
            onChange={(e) => router.push(`${filterBasePath}?block=${e.target.value}`)}
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
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
          <p className="col-span-2 self-center text-sm text-ink-soft sm:col-span-1">
            ({selectedIds.length} dari {rows.length} dipilih)
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button onClick={exportCsv} className="btn-ghost w-full justify-center sm:w-auto">
            <Icon name="receipt" size={18} />
            Excel
          </button>
          <button type="button" onClick={printPdf} className="btn-ghost w-full justify-center sm:w-auto">
            <Icon name="receipt" size={18} />
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mb-6 grid grid-cols-1 gap-3 print:hidden sm:grid-cols-2">
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Rumah Menunggak</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{selectedRows.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Total Piutang</p>
          <p className="mt-1 whitespace-nowrap text-xl font-extrabold leading-tight tracking-tight text-red-500 sm:text-2xl">
            {formatRupiah(selectedTotal)}
          </p>
        </div>
      </div>

      <h2 className="mb-3 text-lg font-bold text-ink print:hidden">
        Daftar {reportLabel}{selectedBlock !== "SEMUA" ? ` — ${selectedBlock}` : ""}
      </h2>

      <p className="mb-3 text-xs text-ink-soft print-only">
        {selectedRows.length} unit rumah menunggak {reportKind} 1 bulan atau lebih.
      </p>
      <p className="mb-4 text-sm font-semibold text-ink print-only">
        {formatRupiah(selectedTotal)} total piutang yang dimiliki.
      </p>

      <div className="space-y-3 print:hidden md:hidden">
        {selectedRows.map((r) => (
          <div
            key={`mobile-${r.id}`}
            className={`card w-full rounded-2xl border p-4 text-left transition ${
              selectedIds.includes(r.id)
                ? "border-pelican-300 bg-pelican-50/40"
                : "border-black/10 bg-white"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-3xl font-extrabold leading-tight text-ink">
                  {r.block} No {r.no}
                </p>
                <p className="mt-1 text-lg text-ink-soft">{r.ownerName ?? "Belum pengkinian data"}</p>
                <p className="mt-2 text-xl font-bold text-red-500">
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

            <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-3">
              <button
                type="button"
                onClick={() => toggleRow(r.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  selectedIds.includes(r.id)
                    ? "bg-pelican-100 text-pelican-800"
                    : "bg-black/5 text-ink-soft"
                }`}
              >
                {selectedIds.includes(r.id) ? "Terpilih" : "Pilih"}
              </button>
              <p className="text-xs text-ink-faint">Tap panah untuk detail bulan</p>
            </div>

            {expandedIds.includes(r.id) && (
              <div className="mt-4 space-y-2">
                {r.bills.map((b, idx) => (
                  <div
                    key={`${r.id}-${b.year}-${b.month}-${idx}`}
                    className="rounded-lg border border-black/10 bg-white p-3"
                  >
                    <p className="text-base font-semibold text-ink">
                      Bulan {b.month} Tahun {b.year}
                    </p>
                    <p className="text-sm text-ink-soft">
                      Nominal: <span className="font-semibold text-ink">{formatRupiah(b.amount)}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden card print:hidden md:block">
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
        <div className="card p-8 text-center text-sm text-ink-faint print:hidden md:hidden">
          Tidak ada data terpilih.
        </div>
      )}

      <div className="print-signatures hidden print-only">
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
