"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { ActionForm } from "./ActionForm";
import { confirmPendingPayments } from "@/app/admin/actions";

type PendingPayment = {
  id: number;
  orderId: string;
  amount: number;
  paymentType: string | null;
  settledAt: string | null;
  house: {
    block: string;
    no: string;
    ownerName: string | null;
  } | null;
};

export function PendingSaldoReview({ payments }: { payments: PendingPayment[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary w-full sm:w-auto">
        <Icon name="check" size={18} />
        Update Saldo
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Konfirmasi Saldo Pending">
        {payments.length === 0 ? (
          <div className="rounded-2xl bg-black/[0.03] p-4 text-sm text-ink-soft">
            Tidak ada saldo pending untuk dikonfirmasi.
          </div>
        ) : (
          <ActionForm
            action={confirmPendingPayments}
            onSuccess={() => setOpen(false)}
            className="space-y-4"
          >
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {payments.map((payment) => (
                <label
                  key={payment.id}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/5 bg-white p-3 transition hover:border-pelican-200 hover:bg-pelican-50/40"
                >
                  <input
                    type="checkbox"
                    name="paymentIds"
                    value={payment.id}
                    className="mt-1 h-4 w-4 rounded border-black/20 text-pelican-600"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-ink">
                          {payment.house ? `Blok ${payment.house.block} / No. ${payment.house.no}` : payment.orderId}
                        </p>
                        <p className="text-xs text-ink-faint">
                          {payment.house?.ownerName ?? "Pemilik tidak tercatat"}
                        </p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">
                        REVIEW
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-ink-soft">{formatRupiah(payment.amount)}</p>
                    <p className="text-xs text-ink-faint">
                      {payment.paymentType ?? "-"}
                      {payment.settledAt ? ` • ${formatDateTime(payment.settledAt)}` : ""}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            <button type="submit" className="btn-primary w-full">
              <Icon name="check" size={18} />
              Konfirmasi yang dipilih
            </button>
          </ActionForm>
        )}
      </Modal>
    </>
  );
}