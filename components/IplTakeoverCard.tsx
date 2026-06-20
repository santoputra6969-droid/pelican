"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createTakeoverPayment,
  type CreatePaymentResult,
} from "@/app/actions";
import { Icon } from "./Icon";
import { formatRupiah } from "@/lib/format";

const MIN_INSTALLMENT = 50000;

function PayButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="btn-primary w-full disabled:opacity-60"
    >
      {pending ? "Memproses…" : "Bayar Cicilan"}
    </button>
  );
}

export function IplTakeoverCard({
  total,
  paid,
  pending,
  remaining,
}: {
  total: number;
  paid: number;
  pending: number;
  remaining: number;
}) {
  const [open, setOpen] = useState(false);
  const minAllowed = Math.min(MIN_INSTALLMENT, remaining);
  const [amount, setAmount] = useState<number>(minAllowed);
  const [state, formAction] = useActionState<CreatePaymentResult, FormData>(
    createTakeoverPayment,
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

  const invalid =
    !Number.isFinite(amount) ||
    amount < minAllowed ||
    amount > remaining;

  const progress = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  return (
    <section className="mt-5 px-5">
      <div className="card overflow-hidden p-0">
        <div className="flex items-center gap-3 bg-amber-50 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Icon name="history" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900">
              Tunggakan IPL Lama
            </p>
            <p className="text-[11px] text-amber-700">
              Sebelum 2025 · tidak termasuk tagihan berjalan
            </p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-black/5 p-3">
              <p className="text-[11px] text-ink-faint">Total Tunggakan</p>
              <p className="text-sm font-extrabold text-ink">
                {formatRupiah(total)}
              </p>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-3">
              <p className="text-[11px] text-emerald-700">Sudah Dibayar</p>
              <p className="text-sm font-extrabold text-emerald-700">
                {formatRupiah(paid)}
              </p>
            </div>
          </div>

          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-ink-faint">
              <span>{progress}% lunas</span>
              <span className="font-semibold text-ink">
                Sisa {formatRupiah(remaining)}
              </span>
            </div>
          </div>

          {pending > 0 && (
            <p className="rounded-xl bg-blue-50 px-3 py-2 text-[11px] font-medium text-blue-700">
              Cicilan {formatRupiah(pending)} sedang diverifikasi pengurus.
            </p>
          )}

          {remaining > 0 ? (
            !open ? (
              <button
                onClick={() => {
                  setAmount(minAllowed);
                  setOpen(true);
                }}
                className="btn-primary w-full"
              >
                Cicil Sekarang
              </button>
            ) : (
              <form action={formAction} className="space-y-3">
                <label className="block text-xs font-semibold text-ink">
                  Nominal Cicilan
                  <span className="ml-1 font-normal text-ink-faint">
                    (min {formatRupiah(minAllowed)})
                  </span>
                </label>
                <div className="flex items-center gap-2 rounded-2xl border border-black/10 px-3 py-2">
                  <span className="text-sm font-bold text-ink-faint">Rp</span>
                  <input
                    type="number"
                    name="amount"
                    inputMode="numeric"
                    min={minAllowed}
                    max={remaining}
                    step={1}
                    value={Number.isFinite(amount) ? amount : ""}
                    onChange={(e) => setAmount(Math.round(Number(e.target.value)))}
                    className="w-full bg-transparent text-sm font-bold text-ink outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[50000, 100000, 200000].map((v) =>
                    v <= remaining ? (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(v)}
                        className="chip"
                      >
                        {formatRupiah(v)}
                      </button>
                    ) : null
                  )}
                  <button
                    type="button"
                    onClick={() => setAmount(remaining)}
                    className="chip"
                  >
                    Lunasi ({formatRupiah(remaining)})
                  </button>
                </div>
                {state && !state.ok && (
                  <p className="text-xs font-medium text-red-600">
                    {state.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="btn-ghost flex-1"
                  >
                    Batal
                  </button>
                  <div className="flex-1">
                    <PayButton disabled={invalid} />
                  </div>
                </div>
              </form>
            )
          ) : (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-700">
              Tunggakan lama sudah lunas. Terima kasih!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
