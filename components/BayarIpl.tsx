"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { payBill, type PayResult } from "@/app/actions";
import { Icon } from "./Icon";
import { formatPeriod, formatRupiah } from "@/lib/format";

type BillLite = {
  id: number;
  year: number;
  month: number;
  amount: number;
};

const methods = [
  { id: "VA", label: "Virtual Account BCA", icon: "wallet" as const },
  { id: "QRIS", label: "QRIS", icon: "scan" as const },
];

export function BayarIpl({
  bills,
  paidBills = [],
}: {
  bills: BillLite[];
  paidBills?: BillLite[];
}) {
  const [tab, setTab] = useState<"aktif" | "terbayar">("aktif");
  const [selectedIds, setSelectedIds] = useState<number[]>(
    bills[0] ? [bills[0].id] : []
  );
  const [method, setMethod] = useState("VA");
  const [state, formAction] = useActionState<PayResult, FormData>(
    payBill,
    null
  );

  const selectedBills = bills.filter((b) => selectedIds.includes(b.id));

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
            Tagihan Aktif ({bills.length})
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
      ) : bills.length === 0 ? (
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
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          selectedBills={selectedBills}
          method={method}
          setMethod={setMethod}
          formAction={formAction}
          state={state}
        />
      )}
    </>
  );
}

function ActiveBills({
  bills,
  selectedIds,
  setSelectedIds,
  selectedBills,
  method,
  setMethod,
  formAction,
  state,
}: {
  bills: BillLite[];
  selectedIds: number[];
  setSelectedIds: (ids: number[]) => void;
  selectedBills: BillLite[];
  method: string;
  setMethod: (m: string) => void;
  formAction: (formData: FormData) => void;
  state: PayResult;
}) {
  const total = selectedBills.reduce((sum, b) => sum + b.amount, 0);
  const allSelected = bills.length > 0 && selectedIds.length === bills.length;

  const toggleBill = (id: number) => {
    setSelectedIds(
      selectedIds.includes(id)
        ? selectedIds.filter((x) => x !== id)
        : [...selectedIds, id]
    );
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : bills.map((b) => b.id));
  };

  return (
    <>
      {/* Tagihan list */}
      <section className="mt-5 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Tagihan IPL</h2>
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
          {bills.map((bill) => {
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
                      <p className="text-[11px] text-ink-faint">
                        Iuran Pemeliharaan Lingkungan
                      </p>
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
          {selectedBills.length === 0 ? (
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
            </div>
          )}
          <div className="my-4 border-t border-dashed border-black/10" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">
              Total Bayar ({selectedBills.length} tagihan)
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
        <div className="card space-y-2 p-4">
          {methods.map((m) => {
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${
                  active ? "border-pelican-300 bg-pelican-50/60" : "border-black/5"
                }`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-pelican-600 shadow-sm">
                  <Icon name={m.icon} size={18} />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">
                  {m.label}
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                    active
                      ? "border-pelican-500 bg-pelican-500 text-white"
                      : "border-black/15"
                  }`}
                >
                  {active && <Icon name="check" size={12} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Pay bar */}
      <form action={formAction} className="sticky bottom-20 z-20 mt-6 px-5">
        <input type="hidden" name="billIds" value={selectedIds.join(",")} />
        <input type="hidden" name="method" value={method} />
        <PayButton amount={total} disabled={selectedBills.length === 0} />
        {state && !state.ok && (
          <p className="mt-2 text-center text-xs font-semibold text-red-500">
            {state.message}
          </p>
        )}
      </form>

      {/* Success sheet */}
      {state?.ok && (
        <div className="fixed inset-0 z-50 mx-auto flex max-w-[480px] items-end bg-black/40 backdrop-blur-sm">
          <div className="w-full animate-fade-up rounded-t-[2rem] bg-white p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pelican-100 text-pelican-600">
              <Icon name="check" size={36} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-ink">
              Pembayaran Berhasil
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              {state.count > 1
                ? `${state.count} tagihan IPL sebesar ${formatRupiah(
                    state.amount
                  )} telah dibayar.`
                : `IPL ${state.period} sebesar ${formatRupiah(
                    state.amount
                  )} telah dibayar.`}
            </p>
            <a href="/transaksi" className="btn-primary mt-5 w-full">
              Lihat Transaksi
            </a>
            <a
              href="/"
              className="mt-2 block text-sm font-semibold text-ink-faint"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      )}
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
