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
  image: string | null;
  date: string;
};

function isTestTransaction(row: Row) {
  return (row.notes ?? "").trim().toUpperCase().startsWith("[TEST]");
}

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
  const [scope, setScope] = useState<"ALL" | "NORMAL" | "TEST">("ALL");
  const [kopSrc, setKopSrc] = useState("/kop-surat.png");
  const [kopOk, setKopOk] = useState(true);

  const totalTest = useMemo(
    () => transactions.filter((t) => isTestTransaction(t)).length,
    [transactions]
  );
  const totalNormal = transactions.length - totalTest;

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return transactions.filter(
      (t) =>
        (scope === "ALL" ||
          (scope === "TEST" && isTestTransaction(t)) ||
          (scope === "NORMAL" && !isTestTransaction(t))) &&
        ((t.type ?? "").toLowerCase().includes(q) ||
          (t.notes ?? "").toLowerCase().includes(q) ||
          (t.createdBy ?? "").toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q))
    );
  }, [transactions, query, scope]);

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

  function buildSummaryRows() {
    const byCategory = new Map<
      string,
      { count: number; masuk: number; keluar: number }
    >();

    for (const row of filtered) {
      const current = byCategory.get(row.category) ?? {
        count: 0,
        masuk: 0,
        keluar: 0,
      };
      current.count += 1;
      if (row.mutation === "DEBIT") {
        current.masuk += row.amount;
      } else {
        current.keluar += row.amount;
      }
      byCategory.set(row.category, current);
    }

    return Array.from(byCategory.entries())
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .map(([category, value]) => ({
        category,
        ...value,
        net: value.masuk - value.keluar,
      }));
  }

  async function printPdf() {
    if (typeof window === "undefined") return;
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const autoTable = autoTableModule.default;

    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    let currentY = margin;

    const kopDataUrl = await loadKopDataUrl(window.location.origin);
    if (kopDataUrl) {
      const imageType = kopDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      const kopWidth = pageWidth - margin * 2;
      let kopHeight = kopWidth / 6.4;
      try {
        const props = doc.getImageProperties(kopDataUrl);
        if (props?.width && props?.height) {
          kopHeight = (props.height / props.width) * kopWidth;
        }
      } catch {
        // fallback ratio
      }
      doc.addImage(kopDataUrl, imageType, margin, currentY, kopWidth, kopHeight);
      currentY += kopHeight + 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, pageWidth / 2, currentY, { align: "center" });
    currentY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, pageWidth / 2, currentY, { align: "center" });
    currentY += 4.5;
    doc.setTextColor(107, 114, 128);
    doc.text(
      `Dicetak pada ${formatDateTimeLong(new Date())} WIB`,
      pageWidth / 2,
      currentY,
      { align: "center" }
    );
    doc.setTextColor(17, 24, 39);
    currentY += 4;

    const totalMasuk = filtered
      .filter((t) => t.mutation === "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalKeluar = filtered
      .filter((t) => t.mutation !== "DEBIT")
      .reduce((sum, t) => sum + t.amount, 0);
    const net = totalMasuk - totalKeluar;

    const lineColor: [number, number, number] = [209, 213, 219];
    const textColor: [number, number, number] = [17, 24, 39];
    const headFill: [number, number, number] = [253, 224, 71];
    const baseStyles = {
      font: "helvetica",
      fontSize: 8.5,
      cellPadding: 2,
      lineColor,
      lineWidth: 0.1,
      textColor,
      valign: "top" as const,
    };
    const headStyles = {
      fillColor: headFill,
      textColor,
      fontStyle: "bold" as const,
      lineColor,
      lineWidth: 0.1,
    };

    // Ringkasan
    autoTable(doc, {
      startY: currentY + 4,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: baseStyles,
      headStyles,
      head: [["Total Transaksi", "Total Pemasukan", "Total Pengeluaran", "Saldo Bersih"]],
      body: [
        [
          String(filtered.length),
          formatRupiah(totalMasuk),
          formatRupiah(totalKeluar),
          formatRupiah(net),
        ],
      ],
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
      },
    });

    // Detail transaksi
    const detailBody = filtered.map((t, index) => {
      const masuk = t.mutation === "DEBIT";
      const description =
        t.notes?.trim() || t.type || (masuk ? "Pemasukan" : "Pengeluaran");
      const printDate = new Date(t.date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return [
        String(index + 1),
        printDate,
        description,
        masuk ? formatRupiah(t.amount) : "",
        !masuk ? formatRupiah(t.amount) : "",
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: baseStyles,
      headStyles,
      head: [["No", "Tanggal", "Keterangan", "Uang Masuk", "Uang Keluar"]],
      body: detailBody.length
        ? detailBody
        : [["", "", "Tidak ada transaksi.", "", ""]],
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 24 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 30, halign: "right" },
      },
    });

    // Rekap per kategori
    const summaryRows = buildSummaryRows();
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 6,
      margin: { left: margin, right: margin },
      theme: "grid",
      styles: baseStyles,
      headStyles: { ...headStyles, fillColor: [219, 234, 254] as [number, number, number] },
      head: [["Jenis", "Jumlah Trx", "Masuk", "Keluar", "Net"]],
      body: summaryRows.map((row) => [
        row.category,
        String(row.count),
        formatRupiah(row.masuk),
        formatRupiah(row.keluar),
        formatRupiah(row.net),
      ]),
      foot: [
        [
          "TOTAL",
          String(filtered.length),
          formatRupiah(totalMasuk),
          formatRupiah(totalKeluar),
          formatRupiah(net),
        ],
      ],
      footStyles: {
        fillColor: [243, 244, 246] as [number, number, number],
        textColor,
        fontStyle: "bold" as const,
        lineColor,
        lineWidth: 0.1,
      },
      columnStyles: {
        1: { halign: "center" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right" },
      },
    });

    // Tanda tangan
    let signY = (doc as any).lastAutoTable.finalY + 16;
    if (signY + 30 > pageHeight) {
      doc.addPage();
      signY = margin + 10;
    }
    doc.setFontSize(10);
    const leftX = margin + (pageWidth - margin * 2) * 0.25;
    const rightX = margin + (pageWidth - margin * 2) * 0.75;
    doc.text("Dibuat oleh,", leftX, signY, { align: "center" });
    doc.text("Mengetahui,", rightX, signY, { align: "center" });
    doc.text("Admin / Bendahara", leftX, signY + 22, { align: "center" });
    doc.text("Ketua Pengelola", rightX, signY + 22, { align: "center" });

    doc.save(
      `laporan-transaksi-${new Date().toISOString().slice(0, 10)}.pdf`
    );
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
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setScope("ALL")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              scope === "ALL"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Semua ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setScope("NORMAL")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              scope === "NORMAL"
                ? "bg-pelican-700 text-white"
                : "bg-pelican-50 text-pelican-700"
            }`}
          >
            Normal ({totalNormal})
          </button>
          <button
            type="button"
            onClick={() => setScope("TEST")}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${
              scope === "TEST"
                ? "bg-amber-600 text-white"
                : "bg-amber-50 text-amber-700"
            }`}
          >
            Data Test ({totalTest})
          </button>
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
      <div className="hidden overflow-x-auto print:block md:block">
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
              const isTest = isTestTransaction(t);
              return (
                <tr key={t.id} className="hover:bg-black/[0.015]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-ink">
                        {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                      </p>
                      {isTest && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          TEST
                        </span>
                      )}
                    </div>
                    {t.notes && (
                      <p className="max-w-md truncate text-[11px] text-ink-faint">
                        {t.notes}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-ink-soft">
                      dibuat oleh: {t.createdBy ?? "—"}
                    </p>
                    {t.image && (
                      <a
                        href={`/admin/files/${t.image}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-semibold text-pelican-700 underline"
                      >
                        Lihat Gambar
                      </a>
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
          const isTest = isTestTransaction(t);
          const amountColor = masuk ? "text-pelican-700" : "text-red-500";
          return (
            <div key={t.id} className="card overflow-hidden p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold leading-snug text-ink">
                      {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                    </p>
                    {isTest && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        TEST
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug text-ink-faint">
                    {t.notes ?? "Tanpa catatan"}
                  </p>
                  {t.image && (
                    <a
                      href={`/admin/files/${t.image}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-[11px] font-semibold text-pelican-700 underline"
                    >
                      Lihat Gambar
                    </a>
                  )}
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
                  <p className="text-[10px] text-ink-faint">Dibuat oleh</p>
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
