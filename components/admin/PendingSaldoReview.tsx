"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { ActionForm } from "./ActionForm";
import {
  confirmPendingPayments,
  confirmPendingTransactions,
  deletePendingTransaction,
} from "@/app/admin/actions";

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

type PendingTransaction = {
  id: number;
  category: string;
  type: string | null;
  notes: string | null;
  amount: number;
  mutation: string;
  createdBy: string | null;
  date: string;
};

export function PendingSaldoReview({
  payments,
  transactions = [],
}: {
  payments: PendingPayment[];
  transactions?: PendingTransaction[];
}) {
  const [open, setOpen] = useState(false);
  const total = payments.length + transactions.length;

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary relative w-full sm:w-auto">
        <Icon name="check" size={18} />
        Update Saldo
        {total > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-bold text-pelican-700">
            {total}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Update Saldo (Pending)">
        {total === 0 ? (
          <div className="rounded-2xl bg-black/[0.03] p-4 text-sm text-ink-soft">
            Tidak ada saldo pending untuk dikonfirmasi.
          </div>
        ) : (
          <div className="space-y-6">
            {transactions.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
                  Transaksi Manual Pengurus
                </p>
                <ActionForm
                  action={confirmPendingTransactions}
                  onSuccess={() => setOpen(false)}
                  className="space-y-3"
                >
                  <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                    {transactions.map((trx) => {
                      const masuk = trx.mutation === "DEBIT";
                      return (
                        <div
                          key={trx.id}
                          className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white p-3 transition hover:border-pelican-200 hover:bg-pelican-50/40"
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                            <input
                              type="checkbox"
                              name="transactionIds"
                              value={trx.id}
                              defaultChecked
                              className="mt-1 h-4 w-4 rounded border-black/20 text-pelican-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p className="truncate text-sm font-bold text-ink">{trx.type ?? "Transaksi"}</p>
                                <span
                                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                    masuk
                                      ? "bg-pelican-50 text-pelican-700"
                                      : "bg-red-50 text-red-600"
                                  }`}
                                >
                                  {masuk ? "MASUK" : "KELUAR"}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm font-semibold text-ink-soft">
                                {masuk ? "+" : "-"}
                                {formatRupiah(trx.amount)}
                                <span className="ml-1 text-xs font-normal text-ink-faint">
                                  • {trx.category === "PKK" ? "Kas PKK" : "Kas Utama"}
                                </span>
                              </p>
                              {trx.notes && (
                                <p className="truncate text-xs text-ink-faint">{trx.notes}</p>
                              )}
                              <p className="text-[11px] text-ink-faint">
                                {trx.createdBy ?? "-"} • {formatDateTime(trx.date)}
                              </p>
                            </div>
                          </label>
                          <ActionForm action={deletePendingTransaction}>
                            <input type="hidden" name="id" value={trx.id} />
                            <button
                              type="submit"
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50"
                              aria-label="Batalkan"
                              title="Batalkan transaksi pending"
                            >
                              <Icon name="plus" size={15} className="rotate-45" />
                            </button>
                          </ActionForm>
                        </div>
                      );
                    })}
                  </div>

                  <button type="submit" className="btn-primary w-full">
                    <Icon name="check" size={18} />
                    Masukkan ke saldo
                  </button>
                </ActionForm>
              </div>
            )}

            {payments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-faint">
                  Pembayaran Midtrans
                </p>
                <ActionForm
                  action={confirmPendingPayments}
                  onSuccess={() => setOpen(false)}
                  className="space-y-3"
                >
                  <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                    {payments.map((payment) => (
                      <label
                        key={payment.id}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-black/5 bg-white p-3 transition hover:border-pelican-200 hover:bg-pelican-50/40"
                      >
                        <input
                          type="checkbox"
                          name="paymentIds"
                          value={payment.id}
                          defaultChecked
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
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}