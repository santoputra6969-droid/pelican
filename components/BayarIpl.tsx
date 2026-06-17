"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPayment, type CreatePaymentResult } from "@/app/actions";
import { Icon } from "./Icon";
import { formatPeriod, formatRupiah } from "@/lib/format";

type BillLite = {
  id: number;
  year: number;
  month: number;
  amount: number;
};

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        opts?: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export function BayarIpl({
  bills,
  paidBills = [],
  futureBills = [],
}: {
  bills: BillLite[];
  paidBills?: BillLite[];
  futureBills?: { year: number; month: number; amount: number }[];
}) {
  const orderedBills = useMemo(
    () => [...bills].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year)),
    [bills]
  );
  const orderedFutureBills = useMemo(
    () => [...futureBills].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year)),
    [futureBills]
  );
  const [tab, setTab] = useState<"aktif" | "terbayar">("aktif");
  const [selectedIds, setSelectedIds] = useState<number[]>(
    orderedBills[0] ? [orderedBills[0].id] : []
  );
  const [selectedFutureMonths, setSelectedFutureMonths] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [state, formAction] = useActionState<CreatePaymentResult, FormData>(
    createPayment,
    null
  );

  // Saat token Snap siap, buka popup pembayaran Midtrans.
  useEffect(() => {
    if (state?.ok && state.token) {
      const orderId = state.orderId;
      const finish = () => {
        window.location.href = `/bayar-ipl/selesai?order_id=${orderId}`;
      };
      if (typeof window !== "undefined" && window.snap) {
        window.snap.pay(state.token, {
          onSuccess: finish,
          onPending: finish,
          onError: finish,
        });
      } else {
        // Snap belum termuat: arahkan ke halaman status.
        finish();
      }
    }
  }, [state]);

  const selectedBills = orderedBills.filter((b) => selectedIds.includes(b.id));
  const selectedFuture = orderedFutureBills.filter((b) => selectedFutureMonths.includes(b.month));
  const activeCount = bills.length + futureBills.length;

  useEffect(() => {
    setSelectedIds(orderedBills[0] ? [orderedBills[0].id] : []);
    setSelectedFutureMonths([]);
  }, [orderedBills, orderedFutureBills]);

  return (
    <>
      {/* Tabs */}
      <section className="mt-6 px-5">
        <div className="flex rounded-2xl bg-black/5 p-1">
          <button
            onClick={() => setTab("aktif")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === "aktif" ? "bg-white text-pelican-700 shadow-sm" : "text-ink-soft"
            }`}
          >
            Tagihan Aktif ({activeCount})
          </button>
          <button
            onClick={() => setTab("terbayar")}
            className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
              tab === "terbayar" ? "bg-white text-pelican-700 shadow-sm" : "text-ink-soft"
            }`}
          >
            Tagihan Terbayar ({paidBills.length})
          </button>
        </div>
      </section>

      {tab === "terbayar" ? (
        <section className="mt-5 px-5">
          {paidBills.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 p-10 text-center">
              <Icon name="receipt" size={36} className="text-ink-faint" />
              <p className="text-sm font-semibold text-ink">
                Belum ada tagihan terbayar
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-black/5">
              {paidBills.map((bill) => (
                <div key={bill.id} className="flex items-center gap-3 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
                    <Icon name="check" size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink">
                      IPL {formatPeriod(bill.year, bill.month)}
                    </p>
                    <p className="text-[11px] font-semibold text-pelican-600">
                      Lunas
                    </p>
                  </div>
                  <p className="text-sm font-extrabold text-ink">
                    {formatRupiah(bill.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : activeCount === 0 ? (
        <section className="mt-5 px-5">
          <div className="card flex flex-col items-center gap-3 p-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pelican-100 text-pelican-600">
              <Icon name="check" size={36} />
            </div>
            <p className="text-base font-bold text-ink">Tidak ada tagihan</p>
            <p className="text-sm text-ink-faint">
              Semua tagihan IPL Anda sudah lunas. Terima kasih!
            </p>
          </div>
        </section>
      ) : (
        <ActiveBills
          bills={bills}
          futureBills={futureBills}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          selectedFutureMonths={selectedFutureMonths}
          setSelectedFutureMonths={setSelectedFutureMonths}
          selectedBills={selectedBills}
          selectedFuture={selectedFuture}
          formAction={formAction}
          state={state}
          bulkOpen={bulkOpen}
          setBulkOpen={setBulkOpen}
        />
      )}
    </>
  );
}

function ActiveBills({
  bills,
  futureBills,
  selectedIds,
  setSelectedIds,
  selectedFutureMonths,
  setSelectedFutureMonths,
  selectedBills,
  selectedFuture,
  formAction,
  state,
  bulkOpen,
  setBulkOpen,
}: {
  bills: BillLite[];
  futureBills: { year: number; month: number; amount: number }[];
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  selectedFutureMonths: number[];
  setSelectedFutureMonths: (months: number[]) => void;
  selectedBills: BillLite[];
  selectedFuture: { year: number; month: number; amount: number }[];
  formAction: (formData: FormData) => void;
  state: CreatePaymentResult;
  bulkOpen: boolean;
  setBulkOpen: (v: boolean) => void;
}) {
  const orderedBills = useMemo(
    () => [...bills].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year)),
    [bills]
  );
  const orderedFutureBills = useMemo(
    () => [...futureBills].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year)),
    [futureBills]
  );
  const baseTotal = selectedBills.reduce((sum, b) => sum + b.amount, 0);
  const futureTotal = selectedFuture.reduce((sum, b) => sum + b.amount, 0);
  const total = baseTotal + futureTotal;
  const allSelected =
    bills.length + futureBills.length > 0 &&
    selectedIds.length === bills.length &&
    selectedFutureMonths.length === futureBills.length;

  const toggleBill = (id: number) => {
    const targetIndex = orderedBills.findIndex((bill) => bill.id === id);
    if (targetIndex === -1) return;

    const nextSelectedIds = selectedIds.includes(id)
      ? orderedBills.slice(0, targetIndex).map((bill) => bill.id)
      : orderedBills.slice(0, targetIndex + 1).map((bill) => bill.id);

    setSelectedIds(nextSelectedIds);
    if (nextSelectedIds.length !== orderedBills.length) {
      setSelectedFutureMonths([]);
    }
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
      setSelectedFutureMonths([]);
      return;
    }
    setSelectedIds(orderedBills.map((b) => b.id));
    setSelectedFutureMonths(orderedFutureBills.map((b) => b.month));
  };

  const toggleFuture = (month: number) => {
    if (selectedIds.length !== orderedBills.length) return;

    const targetIndex = orderedFutureBills.findIndex((bill) => bill.month === month);
    if (targetIndex === -1) return;

    setSelectedFutureMonths(
      selectedFutureMonths.includes(month)
        ? orderedFutureBills.slice(0, targetIndex).map((bill) => bill.month)
        : orderedFutureBills.slice(0, targetIndex + 1).map((bill) => bill.month)
    );
  };

  const bulkRows = [
    ...orderedBills.map((b) => ({
      key: `due-${b.id}`,
      year: b.year,
      month: b.month,
      amount: b.amount,
      kind: "DUE" as const,
      selected: selectedIds.includes(b.id),
      toggle: () => toggleBill(b.id),
    })),
    ...orderedFutureBills.map((b) => ({
      key: `future-${b.year}-${b.month}`,
      year: b.year,
      month: b.month,
      amount: b.amount,
      kind: "FUTURE" as const,
      selected: selectedFutureMonths.includes(b.month),
      toggle: () => toggleFuture(b.month),
    })),
  ].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year));

  return (
    <>
      {/* Bayar Sekaligus */}
      <section className="mt-4 px-5">
        <button
          type="button"
          onClick={() => setBulkOpen(!bulkOpen)}
          className="rounded-lg bg-black/55 px-4 py-2 text-sm font-extrabold uppercase tracking-wide text-white shadow-sm transition hover:bg-black/65"
        >
          Bayar Sekaligus
        </button>
      </section>

      {bulkOpen && (
        <section className="mt-3 px-5">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold text-ink">Pilih Bulan Pembayaran</p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-bold text-pelican-700"
              >
                {allSelected ? "Batal Pilih Semua" : "Pilih Semua"}
              </button>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {bulkRows.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={r.toggle}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    r.selected
                      ? "border-pelican-400 bg-pelican-50"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          r.selected
                            ? "border-pelican-500 bg-pelican-500 text-white"
                            : "border-black/20"
                        }`}
                      >
                        {r.selected && <Icon name="check" size={10} />}
                      </span>
                      <span className="text-sm font-semibold text-ink">
                        IPL {formatPeriod(r.year, r.month)}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-ink">
                      {formatRupiah(r.amount)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Tagihan list */}
      <section className="mt-5 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Tagihan IPL (Sampai Bulan Ini)</h2>
          <button
            type="button"
            onClick={toggleAll}
            className="flex items-center gap-2 text-xs font-bold text-pelican-700"
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                allSelected
                  ? "border-pelican-500 bg-pelican-500 text-white"
                  : "border-black/20"
              }`}
            >
              {allSelected && <Icon name="check" size={12} />}
            </span>
            Pilih Semua
          </button>
        </div>
        <div className="space-y-3">
          {orderedBills.map((bill) => {
            const active = selectedIds.includes(bill.id);
            return (
              <button
                key={bill.id}
                type="button"
                onClick={() => toggleBill(bill.id)}
                className={`card w-full p-4 text-left transition ${
                  active ? "ring-2 ring-pelican-500" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        active
                          ? "border-pelican-500 bg-pelican-500 text-white"
                          : "border-black/15"
                      }`}
                    >
                      {active && <Icon name="check" size={12} />}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink">
                        IPL {formatPeriod(bill.year, bill.month)}
                      </p>
                      <p className="text-[11px] text-ink-faint">Iuran Pemeliharaan Lingkungan</p>
                    </div>
                  </div>
                  <p className="text-sm font-extrabold text-ink">
                    {formatRupiah(bill.amount)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Rincian */}
      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Rincian Tagihan</h2>
        <div className="card p-5">
          {selectedBills.length === 0 && selectedFuture.length === 0 ? (
            <p className="text-center text-sm text-ink-faint">
              Pilih tagihan yang ingin dibayar.
            </p>
          ) : (
            <div className="space-y-2.5">
              {selectedBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink-soft">
                    Iuran IPL {formatPeriod(bill.year, bill.month)}
                  </span>
                  <span className="font-semibold text-ink">
                    {formatRupiah(bill.amount)}
                  </span>
                </div>
              ))}
              {selectedFuture.map((bill) => (
                <div
                  key={`summary-future-${bill.year}-${bill.month}`}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-ink-soft">
                    Iuran IPL {formatPeriod(bill.year, bill.month)} (Titipan)
                  </span>
                  <span className="font-semibold text-ink">
                    {formatRupiah(bill.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="my-4 border-t border-dashed border-black/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">
              Total Bayar ({selectedBills.length + selectedFuture.length} tagihan)
            </span>
            <span className="text-xl font-extrabold text-pelican-700">
              {formatRupiah(total)}
            </span>
          </div>
        </div>
      </section>

      {/* Metode */}
      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Metode Pembayaran</h2>
        <div className="card flex items-center gap-3 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
            <Icon name="scan" size={18} />
          </span>
          <p className="text-xs text-ink-soft">
            Pilih metode pembayaran (QRIS, Virtual Account, e-wallet, kartu) di
            langkah berikutnya yang aman oleh Midtrans.
          </p>
        </div>
      </section>

      {/* Pay bar */}
      <form action={formAction} className="sticky bottom-20 z-20 mb-8 mt-6 px-5">
        <input type="hidden" name="billIds" value={selectedIds.join(",")} />
        {selectedFuture.length > 0 && (
          <>
            <input type="hidden" name="advanceYear" value={String(selectedFuture[0].year)} />
            <input
              type="hidden"
              name="advanceMonths"
              value={selectedFuture.map((x) => x.month).join(",")}
            />
          </>
        )}
        <PayButton amount={total} disabled={selectedBills.length === 0 && selectedFuture.length === 0} />
        {state && !state.ok && (
          <p className="mt-2 text-center text-xs font-semibold text-red-500">
            {state.message}
          </p>
        )}
      </form>
    </>
  );
}

function PayButton({
  amount,
  disabled,
}: {
  amount: number;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-primary w-full"
    >
      {pending ? "Memproses..." : `Bayar ${formatRupiah(amount)}`}
    </button>
  );
}
