"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { waiveFees, unwaiveFees } from "@/app/admin/actions";
import { formatPeriod, formatRupiah } from "@/lib/format";

type FeeType = "IPL" | "KAS" | "PKK";

type Bill = { year: number; month: number; amount: number };

type FeeRow = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
  bills: Bill[];
};

type WaiverRow = {
  id: number;
  feeType: string;
  houseId: number;
  block: string;
  no: string;
  ownerName: string | null;
  year: number;
  month: number;
  amount: number;
  reason: string;
  waivedBy: string | null;
  createdAt: string;
};

type Tab = FeeType | "RIWAYAT";

const periodKey = (houseId: number, year: number, month: number) =>
  `${houseId}:${year}:${month}`;

export function PemutihanManager({
  iplRows,
  kasRows,
  pkkRows,
  waivers,
}: {
  iplRows: FeeRow[];
  kasRows: FeeRow[];
  pkkRows: FeeRow[];
  waivers: WaiverRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [tab, setTab] = useState<Tab>("IPL");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedWaivers, setSelectedWaivers] = useState<Set<number>>(new Set());

  const rowsByTab: Record<FeeType, FeeRow[]> = {
    IPL: iplRows,
    KAS: kasRows,
    PKK: pkkRows,
  };

  const activeRows = tab === "RIWAYAT" ? [] : rowsByTab[tab];

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter(
      (r) =>
        `${r.block} ${r.no}`.toLowerCase().includes(q) ||
        `${r.block}${r.no}`.toLowerCase().includes(q) ||
        (r.ownerName ?? "").toLowerCase().includes(q)
    );
  }, [activeRows, query]);

  // Lookup nominal per periode untuk membangun payload.
  const amountByKey = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of activeRows) {
      for (const b of r.bills) {
        map.set(periodKey(r.id, b.year, b.month), b.amount);
      }
    }
    return map;
  }, [activeRows]);

  const selectedCount = selected.size;
  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const key of selected) sum += amountByKey.get(key) ?? 0;
    return sum;
  }, [selected, amountByKey]);

  function switchTab(next: Tab) {
    setTab(next);
    setSelected(new Set());
    setExpanded(new Set());
    setSelectedWaivers(new Set());
    setQuery("");
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePeriod(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleHouse(row: FeeRow) {
    const keys = row.bills.map((b) => periodKey(row.id, b.year, b.month));
    const allOn = keys.every((k) => selected.has(k));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const k of keys) {
        if (allOn) next.delete(k);
        else next.add(k);
      }
      return next;
    });
  }

  function selectAllVisible() {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of filteredRows) {
        for (const b of r.bills) next.add(periodKey(r.id, b.year, b.month));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function submitWaive() {
    if (tab === "RIWAYAT") return;
    if (selected.size === 0) {
      toast("Pilih minimal satu periode tagihan.", "error");
      return;
    }
    if (!reason.trim()) {
      toast("Alasan pemutihan wajib diisi.", "error");
      return;
    }

    const items = Array.from(selected).map((key) => {
      const [houseId, year, month] = key.split(":").map(Number);
      return { houseId, year, month, amount: amountByKey.get(key) ?? 0 };
    });

    const fd = new FormData();
    fd.set("feeType", tab);
    fd.set("reason", reason.trim());
    fd.set("items", JSON.stringify(items));

    startTransition(async () => {
      const res = await waiveFees(fd);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setConfirmOpen(false);
        setReason("");
        setSelected(new Set());
        setExpanded(new Set());
        router.refresh();
      }
    });
  }

  function toggleWaiver(id: number) {
    setSelectedWaivers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submitUnwaive() {
    if (selectedWaivers.size === 0) {
      toast("Pilih pemutihan yang ingin dibatalkan.", "error");
      return;
    }
    const fd = new FormData();
    fd.set("ids", Array.from(selectedWaivers).join(","));
    startTransition(async () => {
      const res = await unwaiveFees(fd);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setSelectedWaivers(new Set());
        router.refresh();
      }
    });
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "IPL", label: "IPL", count: iplRows.length },
    { key: "KAS", label: "Kas", count: kasRows.length },
    { key: "PKK", label: "PKK", count: pkkRows.length },
    { key: "RIWAYAT", label: "Riwayat", count: waivers.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => switchTab(t.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === t.key
                ? "bg-pelican-600 text-white"
                : "bg-black/5 text-ink-soft hover:bg-black/10"
            }`}
          >
            {t.label}
            <span
              className={`ml-2 rounded-full px-1.5 py-0.5 text-[11px] ${
                tab === t.key ? "bg-white/20" : "bg-black/10"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab !== "RIWAYAT" ? (
        <>
          {/* Info */}
          <div className="card mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4">
            <Icon name="shield" size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900">
              Pilih periode bulan yang ingin diputihkan (tunggakan {tab} yang sudah
              dibayar di luar sistem). Periode yang diputihkan akan hilang dari daftar
              tunggakan & total piutang, namun tetap tersimpan di tab Riwayat dan bisa
              dibatalkan.
            </p>
          </div>

          {/* Search & bulk actions */}
          <div className="card mb-4 space-y-3 p-4">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
                <Icon name="search" size={18} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari blok, nomor, atau nama..."
                className="input pl-10"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm font-semibold text-ink-soft"
              >
                Pilih semua tampil
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-lg border border-black/15 bg-black/5 px-3 py-2 text-sm font-semibold text-ink-faint"
              >
                Bersihkan
              </button>
              <p className="text-sm text-ink-soft">
                {selectedCount} periode dipilih · {formatRupiah(selectedTotal)}
              </p>
            </div>
          </div>

          {/* List rumah */}
          <div className="space-y-2">
            {filteredRows.length === 0 ? (
              <div className="card p-8 text-center text-sm text-ink-faint">
                Tidak ada tunggakan {tab}.
              </div>
            ) : (
              filteredRows.map((r) => {
                const keys = r.bills.map((b) => periodKey(r.id, b.year, b.month));
                const selectedInHouse = keys.filter((k) => selected.has(k)).length;
                const total = r.bills.reduce((s, b) => s + b.amount, 0);
                const isOpen = expanded.has(r.id);
                return (
                  <div key={r.id} className="card overflow-hidden">
                    <div className="flex items-center gap-3 p-4">
                      <input
                        type="checkbox"
                        checked={selectedInHouse > 0 && selectedInHouse === keys.length}
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              selectedInHouse > 0 && selectedInHouse < keys.length;
                        }}
                        onChange={() => toggleHouse(r)}
                        className="h-4 w-4 accent-pelican-600"
                      />
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-ink">
                            {r.block} No {r.no}
                          </p>
                          <p className="truncate text-sm text-ink-soft">
                            {r.ownerName ?? "Belum pengkinian data"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-red-500">
                            {r.bills.length} bulan
                          </p>
                          <p className="text-xs text-ink-faint">{formatRupiah(total)}</p>
                        </div>
                        <Icon
                          name="chevron-right"
                          size={18}
                          className={`text-ink-faint transition ${isOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                    </div>

                    {isOpen && (
                      <div className="border-t border-black/5 bg-black/[0.015] p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {r.bills.map((b) => {
                            const key = periodKey(r.id, b.year, b.month);
                            const on = selected.has(key);
                            return (
                              <label
                                key={key}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                                  on
                                    ? "border-pelican-300 bg-pelican-50"
                                    : "border-black/10 bg-white"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={on}
                                  onChange={() => togglePeriod(key)}
                                  className="h-4 w-4 accent-pelican-600"
                                />
                                <span className="flex-1 font-medium text-ink">
                                  {formatPeriod(b.year, b.month)}
                                </span>
                                <span className="text-xs text-ink-soft">
                                  {formatRupiah(b.amount)}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Action bar */}
          {selectedCount > 0 && (
            <div className="sticky bottom-4 z-10 mt-4">
              <div className="card flex items-center justify-between gap-3 border-pelican-200 bg-white p-4 shadow-soft">
                <div>
                  <p className="text-sm font-bold text-ink">
                    {selectedCount} periode dipilih
                  </p>
                  <p className="text-xs text-ink-soft">
                    Total {formatRupiah(selectedTotal)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="btn-primary"
                >
                  <Icon name="shield" size={18} />
                  Putihkan terpilih
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Riwayat Pemutihan */
        <>
          {selectedWaivers.size > 0 && (
            <div className="card mb-4 flex items-center justify-between gap-3 p-4">
              <p className="text-sm font-semibold text-ink">
                {selectedWaivers.size} pemutihan dipilih
              </p>
              <button
                type="button"
                onClick={submitUnwaive}
                disabled={pending}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 disabled:opacity-60"
              >
                Batalkan pemutihan (tagihan aktif kembali)
              </button>
            </div>
          )}

          {waivers.length === 0 ? (
            <div className="card p-8 text-center text-sm text-ink-faint">
              Belum ada tagihan yang diputihkan.
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
                  <tr>
                    <th className="px-3 py-3 w-10"></th>
                    <th className="px-3 py-3">Jenis</th>
                    <th className="px-3 py-3">Rumah</th>
                    <th className="px-3 py-3">Periode</th>
                    <th className="px-3 py-3 text-right">Nominal</th>
                    <th className="px-3 py-3">Alasan</th>
                    <th className="px-3 py-3">Oleh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {waivers.map((w) => (
                    <tr key={w.id}>
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedWaivers.has(w.id)}
                          onChange={() => toggleWaiver(w.id)}
                          className="h-4 w-4 accent-red-600"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
                          {w.feeType}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap font-semibold text-ink">
                        {w.block} No {w.no}
                        <p className="text-xs font-normal text-ink-faint">
                          {w.ownerName ?? "—"}
                        </p>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-soft">
                        {formatPeriod(w.year, w.month)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-ink">
                        {formatRupiah(w.amount)}
                      </td>
                      <td className="px-3 py-3 text-ink-soft">{w.reason}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-ink-faint">
                        {w.waivedBy ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal konfirmasi alasan */}
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Konfirmasi Pemutihan">
        <div className="space-y-4">
          <p className="text-sm text-ink-soft">
            Anda akan memutihkan <strong>{selectedCount} periode</strong> tagihan{" "}
            <strong>{tab}</strong> senilai{" "}
            <strong>{formatRupiah(selectedTotal)}</strong>. Tagihan ini akan hilang dari
            daftar tunggakan. Lanjutkan?
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Alasan pemutihan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Contoh: Sudah dibayar ke developer sebelum serah terima ke RT (cek 12 Jan 2025)."
              className="input resize-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="btn-ghost flex-1 justify-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={submitWaive}
              disabled={pending}
              className="btn-primary flex-1 justify-center disabled:opacity-60"
            >
              {pending ? "Memproses..." : "Ya, putihkan"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
