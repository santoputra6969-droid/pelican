"use client";

import { MONTHS, formatRupiah } from "@/lib/format";

type DailyPoint = {
  day: number;
  label: string;
  masuk: number;
  keluar: number;
};

type CategorySummary = {
  name: string;
  count: number;
  masuk: number;
  keluar: number;
  net: number;
};

export function TransaksiJournalReport({
  year,
  month,
  category,
  daily,
  totalMasuk,
  totalKeluar,
  totalCount,
  avgMasuk,
  avgKeluar,
  categorySummary,
}: {
  year: number;
  month: number;
  category: "SEMUA" | "UTAMA" | "PKK";
  daily: DailyPoint[];
  totalMasuk: number;
  totalKeluar: number;
  totalCount: number;
  avgMasuk: number;
  avgKeluar: number;
  categorySummary: CategorySummary[];
}) {
  const monthLabel = MONTHS[month - 1] ?? String(month);
  const net = totalMasuk - totalKeluar;
  const years = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - i);

  function exportExcel() {
    const header = ["Tanggal", "Masuk", "Keluar"];
    const rows = daily.map((row) => [row.label, row.masuk, row.keluar].join(";"));
    const summary = [
      "",
      `Total Masuk;${totalMasuk}`,
      `Total Keluar;${totalKeluar}`,
      `Selisih;${net}`,
      `Total Transaksi;${totalCount}`,
    ];
    const csv = [header.join(";"), ...rows, ...summary].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-transaksi-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    if (typeof window === "undefined") return;
    window.print();
  }

  return (
    <div className="space-y-5">
      <section className="card p-4 print:hidden">
        <h2 className="mb-3 text-2xl font-bold text-ink">Laporan Bulanan</h2>
        <form method="GET" className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Tahun</label>
              <select name="year" defaultValue={String(year)} className="input">
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Bulan</label>
              <select name="month" defaultValue={String(month)} className="input">
                {MONTHS.map((item, idx) => (
                  <option key={item} value={idx + 1}>
                    {item.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Kategori</label>
            <select name="category" defaultValue={category} className="input">
              <option value="SEMUA">SEMUA</option>
              <option value="UTAMA">UTAMA</option>
              <option value="PKK">PKK</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-[#726d70] px-4 py-2.5 text-sm font-semibold text-white"
          >
            GENERATE
          </button>
        </form>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={exportExcel}
            className="rounded-lg bg-[#1f97ef] px-3 py-2.5 text-sm font-bold text-white"
          >
            TO EXCEL
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-lg bg-red-600 px-3 py-2.5 text-sm font-bold text-white"
          >
            TO PDF
          </button>
        </div>
      </section>

      <section className="print-only">
        <div className="print-report__header">
          <img src="/kop-surat.png" alt="Kop Surat" className="print-kop-image" />
        </div>
        <p className="text-center text-xl font-bold text-black">Laporan Transaksi</p>
        <p className="mb-4 text-center text-sm text-black">
          Periode Bulan {monthLabel} Tahun {year}
        </p>
      </section>

      <section className="card overflow-hidden">
        <div className="bg-black/[0.03] px-4 py-3">
          <h3 className="text-lg font-bold text-ink">Ringkasan Keuangan</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2">
          <SummaryStat label="Total Uang Masuk" value={formatRupiah(totalMasuk)} />
          <SummaryStat label="Total Uang Keluar" value={formatRupiah(totalKeluar)} />
          <SummaryStat label="Selisih (Net)" value={formatRupiah(net)} />
          <SummaryStat label="Total Transaksi" value={`${totalCount} transaksi`} />
          <SummaryStat label="Rata-rata Uang Masuk" value={formatRupiah(avgMasuk)} />
          <SummaryStat label="Rata-rata Uang Keluar" value={formatRupiah(avgKeluar)} />
        </div>
      </section>

      <section className="card p-4">
        <h3 className="text-lg font-bold text-ink">Grafik Transaksi</h3>
        <p className="mt-3 text-base font-semibold text-ink">Tren Uang Masuk & Keluar (Per Hari)</p>
        <div className="mt-3">
          <LineChart data={daily} />
        </div>

        <p className="mt-6 text-base font-semibold text-ink">Proporsi Uang Masuk & Keluar</p>
        <div className="mt-3">
          <PieChart totalMasuk={totalMasuk} totalKeluar={totalKeluar} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="bg-black/[0.03] px-4 py-3">
          <h3 className="text-lg font-bold text-ink">Ringkasan Per Kategori</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-black/[0.05] text-xs font-semibold text-ink-soft">
              <tr>
                <th className="px-4 py-2">Kategori</th>
                <th className="px-4 py-2 text-right">Masuk</th>
                <th className="px-4 py-2 text-right">Keluar</th>
                <th className="px-4 py-2 text-right">Jumlah Transaksi</th>
              </tr>
            </thead>
            <tbody>
              {categorySummary.map((row) => (
                <tr key={row.name} className="border-t border-black/5">
                  <td className="px-4 py-2 font-semibold text-ink">{row.name}</td>
                  <td className="px-4 py-2 text-right text-pelican-700">{formatRupiah(row.masuk)}</td>
                  <td className="px-4 py-2 text-right text-red-600">{formatRupiah(row.keluar)}</td>
                  <td className="px-4 py-2 text-right text-ink-soft">{row.count}</td>
                </tr>
              ))}
              <tr className="border-t border-black/10 bg-black/[0.03] font-bold">
                <td className="px-4 py-2 text-ink">TOTAL</td>
                <td className="px-4 py-2 text-right text-pelican-700">{formatRupiah(totalMasuk)}</td>
                <td className="px-4 py-2 text-right text-red-600">{formatRupiah(totalKeluar)}</td>
                <td className="px-4 py-2 text-right text-ink-soft">{totalCount}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-black/[0.03] px-3 py-2.5">
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function LineChart({ data }: { data: DailyPoint[] }) {
  const width = 860;
  const height = 300;
  const chartLeft = 56;
  const chartRight = width - 16;
  const chartTop = 16;
  const chartBottom = height - 42;
  const innerW = chartRight - chartLeft;
  const innerH = chartBottom - chartTop;

  const maxValueRaw = Math.max(1, ...data.map((d) => Math.max(d.masuk, d.keluar)));
  const maxValue = niceCeil(maxValueRaw);

  const stepX = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const y = (value: number) => chartBottom - (value / maxValue) * innerH;

  const masukPoints = data
    .map((row, idx) => `${chartLeft + idx * stepX},${y(row.masuk)}`)
    .join(" ");
  const keluarPoints = data
    .map((row, idx) => `${chartLeft + idx * stepX},${y(row.keluar)}`)
    .join(" ");

  const tickCount = 4;
  const ticks = Array.from({ length: tickCount }, (_, idx) => {
    const ratio = idx / (tickCount - 1);
    const value = Math.round(maxValue * (1 - ratio));
    return {
      value,
      y: chartTop + innerH * ratio,
    };
  });

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px]">
        {ticks.map((tick, idx) => (
          <g key={`tick-${idx}`}>
            <line
              x1={chartLeft}
              y1={tick.y}
              x2={chartRight}
              y2={tick.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={chartLeft - 8} y={tick.y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
              {formatNumber(tick.value)}
            </text>
          </g>
        ))}

        <line x1={chartLeft} y1={chartTop} x2={chartLeft} y2={chartBottom} stroke="#111827" strokeWidth="1.2" />
        <line x1={chartLeft} y1={chartBottom} x2={chartRight} y2={chartBottom} stroke="#111827" strokeWidth="1.2" />

        <polyline fill="none" stroke="#4caf50" strokeWidth="2.2" points={masukPoints} />
        <polyline fill="none" stroke="#f44336" strokeWidth="2.2" points={keluarPoints} />

        {data.map((row, idx) => {
          const x = chartLeft + idx * stepX;
          const showLabel = idx % Math.max(1, Math.floor(data.length / 8)) === 0 || idx === data.length - 1;
          return (
            <g key={`point-${row.day}`}>
              <circle cx={x} cy={y(row.masuk)} r="4" fill="#fff" stroke="#4caf50" strokeWidth="2" />
              <circle cx={x} cy={y(row.keluar)} r="4" fill="#fff" stroke="#f44336" strokeWidth="2" />
              {showLabel && (
                <text x={x} y={chartBottom + 18} textAnchor="middle" fontSize="11" fill="#111827">
                  {row.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex items-center justify-center gap-5 text-sm font-semibold text-ink">
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 bg-[#4caf50]" />
          Uang Masuk
        </div>
        <div className="flex items-center gap-2">
          <span className="h-5 w-5 bg-[#f44336]" />
          Uang Keluar
        </div>
      </div>
    </div>
  );
}

function PieChart({ totalMasuk, totalKeluar }: { totalMasuk: number; totalKeluar: number }) {
  const total = Math.max(1, totalMasuk + totalKeluar);
  const masukRatio = totalMasuk / total;
  const radius = 120;
  const center = 150;
  const circumference = 2 * Math.PI * radius;
  const masukStroke = circumference * masukRatio;
  const keluarStroke = circumference - masukStroke;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
      <svg width="320" height="320" viewBox="0 0 300 300">
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f44336" strokeWidth="240" />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#4caf50"
          strokeWidth="240"
          strokeDasharray={`${masukStroke} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className="space-y-2 text-lg">
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 bg-[#4caf50]" />
          <span>Uang Masuk ({formatRupiah(totalMasuk)})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-7 w-7 bg-[#f44336]" />
          <span>Uang Keluar ({formatRupiah(totalKeluar)})</span>
        </div>
      </div>
    </div>
  );
}

function niceCeil(value: number) {
  if (value <= 10_000) return 10_000;
  if (value <= 100_000) return Math.ceil(value / 10_000) * 10_000;
  if (value <= 1_000_000) return Math.ceil(value / 100_000) * 100_000;
  if (value <= 10_000_000) return Math.ceil(value / 500_000) * 500_000;
  return Math.ceil(value / 1_000_000) * 1_000_000;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}
