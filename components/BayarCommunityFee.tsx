"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCommunityFeePayment, type CreatePaymentResult } from "@/app/actions";
import { Icon } from "@/components/Icon";
import { formatPeriod, formatRupiah } from "@/lib/format";

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

type FeeBill = { year: number; month: number; amount: number };

function billKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function BayarCommunityFee({
  feeType,
  dueBills,
  paidBills,
  ownerLabel,
}: {
  feeType: "KAS" | "PKK";
  dueBills: FeeBill[];
  paidBills: FeeBill[];
  ownerLabel: string;
}) {
  const [state, formAction] = useActionState<CreatePaymentResult, FormData>(
    createCommunityFeePayment,
    null
  );
  const [bulkOpen, setBulkOpen] = useState(false);
  const orderedDueBills = useMemo(
    () => [...dueBills].sort((a, b) => (a.year === b.year ? a.month - b.month : a.year - b.year)),
    [dueBills]
  );
  const [selectedBulkKeys, setSelectedBulkKeys] = useState<string[]>(
    orderedDueBills[0] ? [billKey(orderedDueBills[0].year, orderedDueBills[0].month)] : []
  );

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
        finish();
      }
    }
  }, [state]);

  useEffect(() => {
    setSelectedBulkKeys(
      orderedDueBills[0] ? [billKey(orderedDueBills[0].year, orderedDueBills[0].month)] : []
    );
  }, [orderedDueBills]);

  const totalDue = orderedDueBills.reduce((sum, bill) => sum + bill.amount, 0);
  const oldestBill = orderedDueBills[0] ?? null;
  const selectedBulkBills = orderedDueBills.filter((bill) =>
    selectedBulkKeys.includes(billKey(bill.year, bill.month))
  );
  const selectedBulkTotal = selectedBulkBills.reduce((sum, bill) => sum + bill.amount, 0);

  const toggleBulkBill = (index: number) => {
    const next = orderedDueBills.slice(0, index + 1).map((bill) => billKey(bill.year, bill.month));
    const current = selectedBulkKeys;
    const isSame =
      current.length === next.length && current.every((value, i) => value === next[i]);
    if (isSame) {
      const fallback = orderedDueBills.slice(0, index).map((bill) => billKey(bill.year, bill.month));
      setSelectedBulkKeys(fallback.length > 0 ? fallback : current);
      return;
    }
    setSelectedBulkKeys(next);
  };

  return (
    <>
      <section className="-mt-2 px-5">
        <div className="card flex items-center gap-3 p-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feeType === "PKK" ? "bg-pink-50 text-pink-600" : "bg-sky-50 text-sky-600"}`}>
            <Icon name={feeType === "PKK" ? "heart" : "wallet"} size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{ownerLabel}</p>
            <p className="text-xs text-ink-faint">Iuran {feeType}</p>
          </div>
        </div>
      </section>

      <section className="mt-4 px-5">
        <div className="card overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-faint">Total Tunggakan {feeType}</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">{formatRupiah(totalDue)}</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${dueBills.length > 0 ? "bg-red-50 text-red-600" : "bg-pelican-50 text-pelican-700"}`}>
              {dueBills.length > 0 ? `${dueBills.length} bulan` : "Lunas"}
            </span>
          </div>
          {oldestBill && (
            <p className="mt-3 text-xs font-semibold text-ink-faint">
              Pembayaran satuan hanya dibuka untuk tunggakan paling lama: {formatPeriod(oldestBill.year, oldestBill.month)}
            </p>
          )}
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            disabled={orderedDueBills.length === 0}
            className="mt-4 w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-60"
          >
            {bulkOpen ? "Tutup Pilihan Bayar Sekaligus" : "Pilih Bulan Bayar Sekaligus"}
          </button>
          {bulkOpen && orderedDueBills.length > 0 && (
            <div className="mt-3 rounded-2xl border border-black/10 bg-black/[0.02] p-3">
              <p className="text-xs font-semibold text-ink-faint">
                Bayar Sekaligus wajib urut dari bulan terlama (tidak bisa lompat bulan)
              </p>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
                {orderedDueBills.map((bill, index) => {
                  const key = billKey(bill.year, bill.month);
                  const checked = selectedBulkKeys.includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleBulkBill(index)}
                      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                        checked ? "border-pelican-300 bg-pelican-50" : "border-black/10 bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded border ${
                              checked ? "border-pelican-500 bg-pelican-500 text-white" : "border-black/20"
                            }`}
                          >
                            {checked && <Icon name="check" size={10} />}
                          </span>
                          <span className="text-sm font-semibold text-ink">
                            {feeType} {formatPeriod(bill.year, bill.month)}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-ink">{formatRupiah(bill.amount)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <form action={formAction} className="mt-3 space-y-2">
                <input type="hidden" name="feeType" value={feeType} />
                <input type="hidden" name="scope" value="selected" />
                <input type="hidden" name="selectedPeriods" value={selectedBulkKeys.join(",")} />
                <p className="text-xs font-semibold text-ink-faint">
                  {selectedBulkBills.length} bulan dipilih - {formatRupiah(selectedBulkTotal)}
                </p>
                <SubmitButton
                  disabled={selectedBulkBills.length === 0}
                  feeType={feeType}
                  label="Bayar Sekaligus"
                />
              </form>
            </div>
          )}
          {state && !state.ok && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {state.message}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Rincian Tunggakan</h2>
        {orderedDueBills.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-faint">Tidak ada tunggakan {feeType.toLowerCase()}.</div>
        ) : (
          <div className="card divide-y divide-black/5">
            {orderedDueBills.map((bill, index) => {
              const canPayDirect = index === 0;
              return (
              <div key={`${bill.year}-${bill.month}`} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Icon name={feeType === "PKK" ? "heart" : "wallet"} size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{feeType} {formatPeriod(bill.year, bill.month)}</p>
                  <p className="text-[11px] text-ink-faint">
                    {canPayDirect ? "Belum dibayar" : "Bayar bulan sebelumnya terlebih dahulu"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-bold text-ink">{formatRupiah(bill.amount)}</p>
                  <form action={formAction}>
                    <input type="hidden" name="feeType" value={feeType} />
                    <input type="hidden" name="scope" value="oldest" />
                    <SubmitButton
                      disabled={!canPayDirect || orderedDueBills.length === 0}
                      feeType={feeType}
                      label="Bayar"
                      compact
                    />
                  </form>
                </div>
              </div>
            )})}
          </div>
        )}
      </section>

      {paidBills.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-base font-bold text-ink">Riwayat Terbayar</h2>
          <div className="card divide-y divide-black/5">
            {paidBills.slice(0, 12).map((bill) => (
              <div key={`${bill.year}-${bill.month}`} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
                  <Icon name="check" size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{feeType} {formatPeriod(bill.year, bill.month)}</p>
                  <p className="text-[11px] text-pelican-700">Lunas</p>
                </div>
                <p className="text-sm font-bold text-ink">{formatRupiah(bill.amount)}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function SubmitButton({
  disabled,
  feeType,
  label,
  compact = false,
}: {
  disabled: boolean;
  feeType: "KAS" | "PKK";
  label: string;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`${compact ? "inline-flex rounded-xl px-4 py-2 text-sm" : "btn-primary w-full"} items-center justify-center gap-2 font-bold disabled:opacity-60 ${compact ? "bg-pelican-600 text-white" : ""}`}
    >
      <Icon name={feeType === "PKK" ? "heart" : "wallet"} size={18} />
      {pending ? "Memproses..." : label}
    </button>
  );
}