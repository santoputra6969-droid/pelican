"use client";

import { useActionState, useEffect } from "react";
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

  const totalDue = dueBills.reduce((sum, bill) => sum + bill.amount, 0);

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
          <form action={formAction} className="mt-4">
            <input type="hidden" name="feeType" value={feeType} />
            <SubmitButton disabled={dueBills.length === 0} feeType={feeType} />
          </form>
          {state && !state.ok && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
              {state.message}
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <h2 className="mb-3 text-base font-bold text-ink">Rincian Tunggakan</h2>
        {dueBills.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-faint">Tidak ada tunggakan {feeType.toLowerCase()}.</div>
        ) : (
          <div className="card divide-y divide-black/5">
            {dueBills.map((bill) => (
              <div key={`${bill.year}-${bill.month}`} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Icon name={feeType === "PKK" ? "heart" : "wallet"} size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">{feeType} {formatPeriod(bill.year, bill.month)}</p>
                  <p className="text-[11px] text-ink-faint">Belum dibayar</p>
                </div>
                <p className="text-sm font-bold text-ink">{formatRupiah(bill.amount)}</p>
              </div>
            ))}
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

function SubmitButton({ disabled, feeType }: { disabled: boolean; feeType: "KAS" | "PKK" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={disabled || pending} className="btn-primary w-full disabled:opacity-60">
      <Icon name={feeType === "PKK" ? "heart" : "wallet"} size={18} />
      {pending ? "Memproses..." : `Bayar ${feeType}`}
    </button>
  );
}