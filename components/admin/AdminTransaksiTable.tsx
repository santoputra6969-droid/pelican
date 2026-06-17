"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { printWithIOSClass } from "@/lib/printUtils";

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

export function AdminTransaksiTable({
  transactions,
  title = "Daftar Transaksi",
  subtitle = "Laporan transaksi kas",
}: {
  transactions: Row[];
  title?: string;
  subtitle?: string;
}) {
  const [query, setQuery] = useState("");
  const [kopSrc, setKopSrc] = useState("/kop-surat.png");
  const [kopOk, setKopOk] = useState(true);

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

  function exportCsv() {
    const header = ["Tanggal", "Kategori", "Mutasi", "Jenis", "Catatan", "Petugas", "Nominal"];
    const lines = filtered.map((t) =>
      [
        formatDateTime(t.date),
        t.category,
        t.mutation,
        t.type ?? "",
        t.notes ?? "",
        t.createdBy ?? "",
        t.amount,
      ].join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
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

  function buildPrintHtml() {
    const kopUrl = `${window.location.origin}/kop-surat.png`;
    const rowsHtml = filtered
      .map((t, index) => {
        const masuk = t.mutation === "DEBIT";
        const description = t.notes?.trim() || t.type || (masuk ? "Pemasukan" : "Pengeluaran");
        return `
          <tr>
            <td class="col-no tc">${index + 1}</td>
            <td class="col-date nw">${escapeHtml(formatDateTime(t.date))}</td>
            <td class="col-desc">${escapeHtml(description)}</td>
            <td class="col-amount tr nw">${masuk ? escapeHtml(formatRupiah(t.amount)) : ""}</td>
            <td class="col-amount tr nw">${!masuk ? escapeHtml(formatRupiah(t.amount)) : ""}</td>
          </tr>
        `;
      })
      .join("");

    const totalMasuk = filtered
      .filter((t) => t.mutation === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalKeluar = filtered
      .filter((t) => t.mutation !== "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);

    return `
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>${escapeHtml(title)}</title>
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
              color: #111;
              font-family: Arial, Helvetica, sans-serif;
            }
            .sheet {
              width: 100%;
            }
            .kop {
              width: 100%;
              display: block;
              margin-bottom: 8px;
            }
            .title {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              text-align: center;
            }
            .subtitle {
              margin: 4px 0 12px;
              font-size: 11px;
              text-align: center;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 6px;
              margin-bottom: 10px;
            }
            .summary div {
              border: 1px solid #d1d5db;
              padding: 6px 8px;
              font-size: 10px;
            }
            .summary strong {
              display: block;
              margin-top: 2px;
              font-size: 12px;
            }
            .label {
              color: #6b7280;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 4px 6px;
              font-size: 10px;
              line-height: 1.25;
              vertical-align: top;
            }
            thead th {
              background: #ffeb3b;
              font-weight: 700;
              text-align: left;
            }
            .tc { text-align: center; }
            .tr { text-align: right; }
            .nw { white-space: nowrap; }
            .col-no { width: 7%; }
            .col-date { width: 18%; }
            .col-desc { width: 47%; }
            .col-amount { width: 14%; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
            tfoot { display: table-row-group; }
            .footer {
              margin-top: 10px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 24px;
              font-size: 11px;
            }
            .sign {
              text-align: center;
            }
            .sign .space {
              height: 18mm;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <img class="kop" src="${kopUrl}" alt="Kop Surat" />
            <h1 class="title">${escapeHtml(title)}</h1>
            <p class="subtitle">${escapeHtml(subtitle)}</p>

            <div class="summary">
              <div><span class="label">Total Transaksi</span><strong>${filtered.length}</strong></div>
              <div><span class="label">Total Pemasukan</span><strong>${escapeHtml(formatRupiah(totalMasuk))}</strong></div>
              <div><span class="label">Total Pengeluaran</span><strong>${escapeHtml(formatRupiah(totalKeluar))}</strong></div>
              <div><span class="label">Saldo Bersih</span><strong>${escapeHtml(formatRupiah(totalMasuk - totalKeluar))}</strong></div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="col-no tc">No</th>
                  <th class="col-date">Tanggal</th>
                  <th class="col-desc">Keterangan</th>
                  <th class="col-amount tr">Uang Masuk</th>
                  <th class="col-amount tr">Uang Keluar</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <div class="footer">
              <div class="sign">
                <div>Dibuat oleh,</div>
                <div class="space"></div>
                <div>Admin / Bendahara</div>
              </div>
              <div class="sign">
                <div>Mengetahui,</div>
                <div class="space"></div>
                <div>Ketua Pengelola</div>
              </div>
            </div>
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
  }

  function printPdf() {
    if (typeof window === "undefined") return;
    const win = window.open("", "_blank");
    if (!win) {
      printWithIOSClass();
      return;
    }

    win.document.open();
    win.document.write(buildPrintHtml());
    win.document.close();
  }

  return (
    <div className="card overflow-hidden">
      <div className="print-report mb-3 print-only">
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
              <p className="print-report__title">{title.toUpperCase()}</p>
            </>
          )}
        </div>
        <p className="text-center text-sm font-semibold text-black">{title}</p>
        <p className="text-center text-xs text-black">{subtitle}</p>
      </div>

      <div className="border-b border-black/5 p-4 print:hidden">
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
        <div className="mt-3 grid grid-cols-2 gap-2 print:hidden">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-lg bg-[#1f97ef] px-3 py-2 text-sm font-semibold text-white"
          >
            TO EXCEL
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"
          >
            TO PDF
          </button>
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
      <div className="space-y-3 md:hidden">
        {filtered.map((t) => {
          const masuk = t.mutation === "DEBIT";
          const amountColor = masuk ? "text-pelican-700" : "text-red-500";
          return (
            <div key={t.id} className="card overflow-hidden p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-ink">
                    {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                  </p>
                  <p className="mt-1 text-[11px] leading-snug text-ink-faint">
                    {t.notes ?? "Tanpa catatan"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${amountColor}`}>
                    {masuk ? "+" : "−"}
                    {formatRupiah(t.amount)}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-faint">{t.category}</p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-black/5 pt-3 text-xs text-ink-soft">
                <div>
                  <p className="text-[10px] text-ink-faint">Tanggal</p>
                  <p className="mt-0.5 leading-snug">{formatDateTime(t.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-ink-faint">Petugas</p>
                  <p className="mt-0.5 leading-snug">{t.createdBy ?? "—"}</p>
                </div>
              </div>
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
