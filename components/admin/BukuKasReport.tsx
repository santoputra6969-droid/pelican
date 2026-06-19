"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MONTHS, formatDate, formatPeriod, formatRupiah } from "@/lib/format";

type Bucket = "IPL" | "KAS" | "PKK" | "LAINNYA";

type Row = {
  id: number;
  createdAt: string;
  category: string;
  type: string | null;
  idSettlement: string | null;
  notes: string | null;
  amount: number;
  mutation: string;
};

type PrimarySummary = {
  count: number;
  masuk: number;
  fee: number;
};

type DetailItem = {
  id: number;
  title: string;
  subtitle: string;
  amount: number;
  fee: number;
  bucket: Bucket;
  rawDate: string;
};

export function BukuKasReport({
  year,
  month,
  saldoAwal,
  totalMasuk,
  totalKeluar,
  legacyTotals,
  rows,
}: {
  year: number;
  month: number;
  saldoAwal: number;
  totalMasuk: number;
  totalKeluar: number;
  legacyTotals?: {
    masukSemua: number;
    keluarSemua: number;
    masukUtama: number | null;
    keluarUtama: number | null;
    masukPkk: number | null;
    keluarPkk: number | null;
  } | null;
  rows: Row[];
}) {
  const router = useRouter();
  const [selectedYear, setSelectedYear] = useState(year);
  const [selectedMonth, setSelectedMonth] = useState(month);
  const [activeTab, setActiveTab] = useState<"RINGKASAN" | "DETAIL">("RINGKASAN");
  const [detailBucket, setDetailBucket] = useState<Bucket>("IPL");

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);
  const effectiveMasuk = legacyTotals?.masukSemua ?? totalMasuk;
  const effectiveKeluar = legacyTotals?.keluarSemua ?? totalKeluar;
  const saldoAkhir = saldoAwal + effectiveMasuk - effectiveKeluar;

  async function printPdf() {
    if (typeof window === "undefined") return;

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 28;
    const kopDataUrl = await loadKopDataUrl(window.location.origin);

    const drawHeader = (title: string, subtitle?: string) => {
      let headerY = 24;
      if (kopDataUrl) {
        const imageType = kopDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        doc.addImage(kopDataUrl, imageType, marginX, headerY, pageWidth - marginX * 2, 58);
        headerY += 70;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title, pageWidth / 2, headerY, { align: "center" });
      headerY += 16;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      if (subtitle) {
        doc.text(subtitle, pageWidth / 2, headerY, { align: "center" });
        headerY += 14;
      }
      doc.text(`Dicetak pada: ${formatDateTimeLong(new Date())}`, pageWidth / 2, headerY, {
        align: "center",
      });
      return headerY + 18;
    };

    let cursorY = drawHeader(
      "Buku Kas Bulanan Cluster Puri Pelican",
      `Periode Bulan ${formatPeriod(year, month)}`
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RINGKASAN", marginX, cursorY);
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4 },
      head: [["Kategori", "Jumlah Trx", "Total Bruto", "Fee (0.7%)", "Total Bersih"]],
      body: [
        summaryPdfRow("IPL", report.summary.IPL),
        summaryPdfRow("Kas", report.summary.KAS),
        summaryPdfRow("PKK", report.summary.PKK),
        [
          "Lainnya",
          String(report.summary.LAINNYA.count),
          formatCurrencyCell(report.summary.LAINNYA.masuk),
          formatCurrencyCell(report.summary.LAINNYA.keluar),
          formatCurrencyCell(report.summary.LAINNYA.masuk - report.summary.LAINNYA.keluar),
        ],
      ],
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18)
        : cursorY + 140,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [76, 175, 80], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4 },
      head: [["TOTAL KESELURUHAN", "UTAMA", "PKK", "TOTAL"]],
      body: [
        ["Pemasukan", formatCurrencyCell(report.totals.masukUtama), formatCurrencyCell(report.totals.masukPkk), formatCurrencyCell(report.totals.masuk)],
        ["Pengeluaran", formatCurrencyCell(report.totals.keluarUtama), formatCurrencyCell(report.totals.keluarPkk), formatCurrencyCell(report.totals.keluar)],
        ["Saldo Bersih", formatCurrencyCell(report.totals.masukUtama - report.totals.keluarUtama), formatCurrencyCell(report.totals.masukPkk - report.totals.keluarPkk), formatCurrencyCell(report.totals.net)],
      ],
    });

    const detailSections: Array<{ title: string; rows: DetailItem[] }> = [
      { title: `DETAIL PEMBAYARAN IPL (${report.detailRowsByBucket.IPL.length} Transaksi)`, rows: report.detailRowsByBucket.IPL },
      { title: `DETAIL PEMBAYARAN KAS (${report.detailRowsByBucket.KAS.length} Transaksi)`, rows: report.detailRowsByBucket.KAS },
      { title: `DETAIL PEMBAYARAN PKK (${report.detailRowsByBucket.PKK.length} Transaksi)`, rows: report.detailRowsByBucket.PKK },
    ];

    for (const section of detailSections) {
      doc.addPage();
      const sectionStartY = drawHeader(section.title, `Periode Bulan ${formatPeriod(year, month)}`);
      autoTable(doc, {
        startY: sectionStartY,
        margin: { left: marginX, right: marginX },
        theme: "grid",
        headStyles: { fillColor: [52, 152, 219], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 3 },
        head: [["No", "Blok & No", "Tanggal Bayar", "Bruto", "Fee", "Bersih"]],
        body: section.rows.map((item, index) => [
          String(index + 1),
          item.title,
          formatDateShort(item.rawDate),
          formatCurrencyCell(item.amount),
          formatCurrencyCell(item.fee),
          formatCurrencyCell(item.amount - item.fee),
        ]),
      });
    }

    if (report.detailRowsByBucket.LAINNYA.length > 0) {
      doc.addPage();
      const lainnyaStartY = drawHeader(
        `DETAIL TRANSAKSI LAINNYA (${report.detailRowsByBucket.LAINNYA.length} Transaksi)`,
        `Periode Bulan ${formatPeriod(year, month)}`
      );
      autoTable(doc, {
        startY: lainnyaStartY,
        margin: { left: marginX, right: marginX },
        theme: "grid",
        headStyles: { fillColor: [245, 158, 11], fontSize: 8 },
        styles: { fontSize: 7, cellPadding: 3 },
        head: [["No", "Jenis", "Tanggal", "Bruto", "Fee", "Bersih", "Catatan"]],
        body: report.detailRowsByBucket.LAINNYA.map((item, index) => [
          String(index + 1),
          item.title,
          formatDateShort(item.rawDate),
          formatCurrencyCell(Math.abs(item.amount)),
          formatCurrencyCell(0),
          formatCurrencyCell(item.amount),
          item.subtitle,
        ]),
      });
    }

    doc.addPage();
    const recapStartY = drawHeader(
      "RINCIAN / TOTAL TRANSAKSI",
      `Rekap seluruh transaksi periode ${formatPeriod(year, month)}`
    );

    autoTable(doc, {
      startY: recapStartY,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4 },
      head: [["Kategori", "Jumlah Trx", "Masuk", "Keluar", "Net"]],
      body: [
        [
          "IPL",
          String(report.summary.IPL.count),
          formatCurrencyCell(report.summary.IPL.masuk),
          formatCurrencyCell(report.summary.IPL.fee),
          formatCurrencyCell(report.summary.IPL.masuk - report.summary.IPL.fee),
        ],
        [
          "KAS",
          String(report.summary.KAS.count),
          formatCurrencyCell(report.summary.KAS.masuk),
          formatCurrencyCell(report.summary.KAS.fee),
          formatCurrencyCell(report.summary.KAS.masuk - report.summary.KAS.fee),
        ],
        [
          "PKK",
          String(report.summary.PKK.count),
          formatCurrencyCell(report.summary.PKK.masuk),
          formatCurrencyCell(report.summary.PKK.fee),
          formatCurrencyCell(report.summary.PKK.masuk - report.summary.PKK.fee),
        ],
        [
          "Lainnya",
          String(report.summary.LAINNYA.count),
          formatCurrencyCell(report.summary.LAINNYA.masuk),
          formatCurrencyCell(report.summary.LAINNYA.keluar),
          formatCurrencyCell(report.summary.LAINNYA.masuk - report.summary.LAINNYA.keluar),
        ],
      ],
    });

    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
        ? ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12)
        : recapStartY + 90,
      margin: { left: marginX, right: marginX },
      theme: "grid",
      headStyles: { fillColor: [229, 231, 235], fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 4 },
      head: [["TOTAL", "UTAMA", "PKK", "SELISIH"]],
      body: [[
        `Jumlah ${rows.length} transaksi`,
        formatCurrencyCell(report.totals.masukUtama),
        formatCurrencyCell(report.totals.masukPkk),
        formatCurrencyCell(report.totals.net),
      ]],
    });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i += 1) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Halaman ${i} of ${totalPages}`, marginX, pageHeight - 18);
    }

    doc.save(`buku-kas-${year}-${String(month).padStart(2, "0")}.pdf`);
  }

  function applyPeriod() {
    const params = new URLSearchParams({
      year: String(selectedYear),
      month: String(selectedMonth),
    });
    router.push(`/admin/bukukas?${params.toString()}`);
  }

  function exportCsv() {
    const header = ["Tanggal", "Kategori", "Jenis", "Keterangan", "Masuk", "Keluar"];
    const lines = rows.map((r) => {
      const masuk = r.mutation === "DEBIT" ? r.amount : 0;
      const keluar = r.mutation !== "DEBIT" ? r.amount : 0;
      return [
        formatDate(r.createdAt),
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
      `Total;;;;${effectiveMasuk};${effectiveKeluar}`,
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

  const report = useMemo(() => {
    const sorted = [...rows].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const rowsByBucket: Record<Bucket, Row[]> = { IPL: [], KAS: [], PKK: [], LAINNYA: [] };

    for (const row of sorted) {
      rowsByBucket[getBucket(row.type)].push(row);
    }

    const settlementFee = new Map<string, number>();
    for (const row of sorted) {
      if (!row.idSettlement || row.mutation === "DEBIT" || !isFeeRow(row)) continue;
      settlementFee.set(row.idSettlement, (settlementFee.get(row.idSettlement) ?? 0) + row.amount);
    }

    const summary = {
      IPL: buildPrimarySummary(rowsByBucket.IPL),
      KAS: buildPrimarySummary(rowsByBucket.KAS),
      PKK: buildPrimarySummary(rowsByBucket.PKK),
      LAINNYA: {
        count: rowsByBucket.LAINNYA.length,
        masuk: sumByMutation(rowsByBucket.LAINNYA, "DEBIT"),
        keluar: sumByMutation(rowsByBucket.LAINNYA, "KREDIT"),
      },
    };

    const totals = {
      masuk: effectiveMasuk,
      keluar: effectiveKeluar,
      net: effectiveMasuk - effectiveKeluar,
      masukUtama: legacyTotals?.masukUtama ?? sumByCategory(rows, "UTAMA", "DEBIT"),
      masukPkk: legacyTotals?.masukPkk ?? sumByCategory(rows, "PKK", "DEBIT"),
      keluarUtama: legacyTotals?.keluarUtama ?? sumByCategory(rows, "UTAMA", "KREDIT"),
      keluarPkk: legacyTotals?.keluarPkk ?? sumByCategory(rows, "PKK", "KREDIT"),
    };

    const detailRowsByBucket: Record<Bucket, DetailItem[]> = {
      IPL: buildPrimaryDetails(rowsByBucket.IPL, settlementFee, "IPL"),
      KAS: buildPrimaryDetails(rowsByBucket.KAS, settlementFee, "KAS"),
      PKK: buildPrimaryDetails(rowsByBucket.PKK, settlementFee, "PKK"),
      LAINNYA: rowsByBucket.LAINNYA.map((row) => ({
        id: row.id,
        title: row.type ?? "Transaksi Lainnya",
        subtitle: row.notes || `dicatat pada ${formatDate(row.createdAt)}`,
        amount: row.mutation === "DEBIT" ? row.amount : -row.amount,
        fee: 0,
        bucket: "LAINNYA",
        rawDate: row.createdAt,
      })),
    };

    return { summary, totals, detailRowsByBucket };
  }, [rows, effectiveMasuk, effectiveKeluar, legacyTotals]);

  const currentDetailRows = report.detailRowsByBucket[detailBucket];

  return (
    <div className="bukukas-report">
      <div className="card mb-4 p-4 print:hidden">
        <h3 className="mb-4 text-2xl font-bold text-ink">Pilih Periode</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="input w-full"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">Bulan</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="input w-full"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={applyPeriod}
          className="mt-4 w-full rounded-md bg-black/20 py-2.5 text-sm font-semibold tracking-wide text-ink-soft"
        >
          GENERATE
        </button>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md bg-sky-500 py-2.5 text-sm font-bold tracking-wide text-white"
          >
            TO EXCEL
          </button>
          <button
            type="button"
            onClick={printPdf}
            className="rounded-md bg-red-600 py-2.5 text-sm font-bold tracking-wide text-white"
          >
            TO PDF
          </button>
        </div>
      </div>

      <h2 className="mb-3 text-2xl font-bold text-ink">Buku Kas Bulan {formatPeriod(year, month)}</h2>

      <div className="mb-4 grid grid-cols-2 border-b border-black/10">
        <button
          type="button"
          onClick={() => setActiveTab("RINGKASAN")}
          className={`border-b-2 py-3 text-sm font-semibold tracking-wide ${
            activeTab === "RINGKASAN" ? "border-black/40 text-ink" : "border-transparent text-ink-soft"
          }`}
        >
          RINGKASAN
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("DETAIL")}
          className={`border-b-2 py-3 text-sm font-semibold tracking-wide ${
            activeTab === "DETAIL" ? "border-black/40 text-ink" : "border-transparent text-ink-soft"
          }`}
        >
          DETAIL
        </button>
      </div>

      {activeTab === "RINGKASAN" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SummaryPrimary
              title="IPL"
              count={report.summary.IPL.count}
              amount={report.summary.IPL.masuk}
              fee={report.summary.IPL.fee}
              tone="blue"
            />
            <SummaryPrimary
              title="Kas"
              count={report.summary.KAS.count}
              amount={report.summary.KAS.masuk}
              fee={report.summary.KAS.fee}
              tone="green"
            />
            <SummaryPrimary
              title="PKK"
              count={report.summary.PKK.count}
              amount={report.summary.PKK.masuk}
              fee={report.summary.PKK.fee}
              tone="pink"
            />
            <SummaryOthers
              count={report.summary.LAINNYA.count}
              masuk={report.summary.LAINNYA.masuk}
              keluar={report.summary.LAINNYA.keluar}
            />
          </div>

          <details className="card overflow-hidden" open>
            <summary className="flex cursor-pointer list-none items-center justify-between bg-amber-100/70 px-4 py-3 font-bold text-ink">
              <span>Rincian Transaksi Lainnya</span>
              <span className="text-xs font-medium text-ink-soft">{report.summary.LAINNYA.count} trx</span>
            </summary>
            <div className="space-y-2 px-4 py-3">
              {report.detailRowsByBucket.LAINNYA.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded border border-black/10 px-3 py-2 text-sm">
                  <p className="font-semibold text-ink">{item.title}</p>
                  <p className="text-xs text-ink-soft">{item.subtitle}</p>
                  <p className={`mt-1 font-bold ${item.amount >= 0 ? "text-pelican-700" : "text-red-600"}`}>
                    {item.amount >= 0 ? "+ " : "- "}
                    {formatRupiah(Math.abs(item.amount))}
                  </p>
                </div>
              ))}
            </div>
          </details>

          <TotalCard
            title="Total Pemasukan"
            total={report.totals.masuk}
            subA={{ label: "UTAMA (IPL+Kas+Lainnya)", value: report.totals.masukUtama }}
            subB={{ label: "PKK (PKK+Lainnya)", value: report.totals.masukPkk }}
            tone="green"
          />
          <TotalCard
            title="Total Pengeluaran"
            total={report.totals.keluar}
            subA={{ label: "UTAMA (fee+Lainnya keluar)", value: report.totals.keluarUtama }}
            subB={{ label: "PKK (fee+Lainnya keluar)", value: report.totals.keluarPkk }}
            tone="red"
          />
          <TotalCard
            title="Saldo Bersih Bulan Ini"
            total={report.totals.net}
            subA={{ label: "UTAMA", value: report.totals.masukUtama - report.totals.keluarUtama }}
            subB={{ label: "PKK", value: report.totals.masukPkk - report.totals.keluarPkk }}
            tone="net"
          />

          <div className="card hidden p-4 print:block">
            <p className="text-xs text-ink-faint">Saldo Awal</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatRupiah(saldoAwal)}</p>
            <p className="mt-2 text-xs text-ink-faint">Saldo Akhir</p>
            <p className="mt-1 text-lg font-bold text-ink">{formatRupiah(saldoAkhir)}</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 grid grid-cols-4 border-b border-black/10">
            {(["IPL", "KAS", "PKK", "LAINNYA"] as Bucket[]).map((bucket) => (
              <button
                type="button"
                key={bucket}
                onClick={() => setDetailBucket(bucket)}
                className={`border-b-2 py-3 text-xs font-semibold tracking-wide ${
                  detailBucket === bucket ? "border-black/40 text-ink" : "border-transparent text-ink-soft"
                }`}
              >
                {bucket} ({bucket === "LAINNYA" ? report.summary.LAINNYA.count : report.summary[bucket].count})
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {currentDetailRows.map((item) => (
              <div key={item.id} className="card border-l-4 border-l-green-500 p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-xl font-bold text-ink">{item.title}</p>
                  <span className="rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800">
                    {item.bucket}
                  </span>
                </div>
                <p className="text-xs text-ink-soft">{item.subtitle}</p>
                <p className={`mt-2 text-3xl font-extrabold ${item.amount >= 0 ? "text-pelican-700" : "text-red-600"}`}>
                  {item.amount >= 0 ? "Rp " : "- Rp "}
                  {formatNumberId(Math.abs(item.amount))}
                </p>
                {item.fee > 0 && <p className="mt-1 text-sm text-red-500">fee: -{formatRupiah(item.fee)}</p>}
              </div>
            ))}

            {currentDetailRows.length === 0 && (
              <p className="card p-8 text-center text-sm text-ink-faint">
                Tidak ada transaksi pada kategori ini di periode {formatPeriod(year, month)}.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getBucket(type: string | null): Bucket {
  const upper = (type ?? "").trim().toUpperCase();
  if (upper === "IPL" || upper === "KAS" || upper === "PKK") return upper;
  return "LAINNYA";
}

function isFeeRow(row: Row): boolean {
  return row.mutation !== "DEBIT" && /^\s*FEE\s*-/i.test(row.notes ?? "");
}

function sumByMutation(rows: Row[], mutation: "DEBIT" | "KREDIT") {
  return rows.filter((row) => row.mutation === mutation).reduce((sum, row) => sum + row.amount, 0);
}

function sumByCategory(rows: Row[], category: "UTAMA" | "PKK", mutation: "DEBIT" | "KREDIT") {
  return rows
    .filter((row) => row.category.toUpperCase() === category && row.mutation === mutation)
    .reduce((sum, row) => sum + row.amount, 0);
}

function buildPrimarySummary(rows: Row[]): PrimarySummary {
  return {
    count: rows.filter((row) => row.mutation === "DEBIT").length,
    masuk: rows.filter((row) => row.mutation === "DEBIT").reduce((sum, row) => sum + row.amount, 0),
    fee: rows.filter((row) => isFeeRow(row)).reduce((sum, row) => sum + row.amount, 0),
  };
}

function buildPrimaryDetails(rows: Row[], settlementFee: Map<string, number>, bucket: Bucket): DetailItem[] {
  return rows
    .filter((row) => row.mutation === "DEBIT")
    .map((row) => ({
      id: row.id,
      title: extractHouseLabel(row.notes) || row.type || "Transaksi",
      subtitle: `dibayar pada ${formatDateShort(row.createdAt)}`,
      amount: row.amount,
      fee: row.idSettlement ? settlementFee.get(row.idSettlement) ?? 0 : 0,
      bucket,
      rawDate: row.createdAt,
    }));
}

function extractHouseLabel(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/(PLC-\d+\s*No\s*\d+)/i);
  return match ? match[1].replace(/\s+/g, " ") : null;
}

function formatNumberId(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

function formatDateShort(value: string | Date) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function SummaryPrimary({
  title,
  count,
  amount,
  fee,
  tone,
}: {
  title: string;
  count: number;
  amount: number;
  fee: number;
  tone: "blue" | "green" | "pink";
}) {
  const bg = tone === "blue" ? "bg-sky-50" : tone === "green" ? "bg-green-50" : "bg-pink-50";
  return (
    <div className={`card ${bg} p-4`}>
      <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
        <p>{title}</p>
        <p>{count} trx</p>
      </div>
      <p className="text-3xl font-extrabold text-ink">{formatRupiah(amount)}</p>
      <p className="mt-2 text-sm text-red-500">fee: -{formatRupiah(fee)}</p>
    </div>
  );
}

function SummaryOthers({ count, masuk, keluar }: { count: number; masuk: number; keluar: number }) {
  return (
    <div className="card bg-amber-50 p-4">
      <div className="mb-2 flex items-center justify-between text-sm text-ink-soft">
        <p>Lainnya</p>
        <p>{count} trx</p>
      </div>
      <p className="text-sm text-pelican-700">masuk: +{formatRupiah(masuk)}</p>
      <p className="mt-1 text-sm text-red-500">keluar: -{formatRupiah(keluar)}</p>
    </div>
  );
}

function TotalCard({
  title,
  total,
  subA,
  subB,
  tone,
}: {
  title: string;
  total: number;
  subA: { label: string; value: number };
  subB: { label: string; value: number };
  tone: "green" | "red" | "net";
}) {
  const bg = tone === "green" ? "bg-green-50" : "bg-pink-50";
  const border = tone === "net" ? "border border-red-500" : "";
  const color =
    tone === "green"
      ? "text-pelican-700"
      : tone === "red"
        ? "text-red-600"
        : total >= 0
          ? "text-pelican-700"
          : "text-red-600";
  const sign = tone === "net" && total < 0 ? "- " : "";

  return (
    <div className={`card ${bg} ${border} p-4`}>
      <p className="text-sm text-ink-soft">{title}</p>
      <p className={`mt-2 text-4xl font-extrabold ${color}`}>
        {sign}
        {formatRupiah(Math.abs(total))}
      </p>
      <div className="mt-4 space-y-1 text-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-soft">{subA.label}</p>
          <p className={`font-bold ${subA.value < 0 ? "text-red-600" : "text-ink"}`}>
            {formatSigned(subA.value)}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-ink-soft">{subB.label}</p>
          <p className={`font-bold ${subB.value < 0 ? "text-red-600" : "text-ink"}`}>
            {formatSigned(subB.value)}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatSigned(value: number) {
  if (value < 0) return `-${formatRupiah(Math.abs(value))}`;
  return formatRupiah(value);
}

function formatCurrencyCell(value: number) {
  const prefix = value < 0 ? "-" : "";
  return `${prefix}Rp ${formatNumberId(Math.abs(value))}`;
}

function summaryPdfRow(label: string, summary: PrimarySummary) {
  return [
    label,
    String(summary.count),
    formatCurrencyCell(summary.masuk),
    formatCurrencyCell(summary.fee),
    formatCurrencyCell(summary.masuk - summary.fee),
  ];
}

function formatDateTimeLong(value: string | Date) {
  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadImageAsDataUrl(imageUrl: string) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Gagal memuat gambar kop");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal mengubah gambar ke data URL"));
    reader.readAsDataURL(blob);
  });
}

async function loadKopDataUrl(origin: string) {
  try {
    return await loadImageAsDataUrl(`${origin}/kop-surat.png`);
  } catch {
    try {
      return await loadImageAsDataUrl(`${origin}/kop-surat.jpg`);
    } catch {
      return null;
    }
  }
}
