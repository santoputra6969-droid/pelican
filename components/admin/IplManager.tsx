"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import { generateBills, setIplAmount } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";
import { formatPeriod, formatRupiah } from "@/lib/format";

type Period = {
  year: number;
  month: number;
  count: number;
  paid: number;
  total: number;
};

export function IplManager({
  iplAmount,
  houseCount,
  payIplCount,
  periods,
}: {
  iplAmount: number;
  houseCount: number;
  payIplCount: number;
  periods: Period[];
}) {
  const [amount, setAmount] = useState(iplAmount);

  const nextPeriod = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* IPL amount + periods */}
      <div className="lg:col-span-2">
        <div className="card p-5">
          <p className="text-xs text-ink-faint">Nominal IPL per bulan</p>
          <p className="text-2xl font-extrabold text-pelican-700">
            {formatRupiah(iplAmount)}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            Berlaku untuk {payIplCount} dari {houseCount} rumah.
          </p>

          <ActionForm action={setIplAmount} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Ubah Nominal (Rp) — diterapkan ke semua rumah
              </label>
              <input
                name="amount"
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary">
              <Icon name="check" size={18} />
              Simpan Nominal
            </button>
          </ActionForm>
        </div>

        {/* Recent generated periods */}
        <div className="card mt-6 p-5">
          <h2 className="mb-3 text-base font-bold text-ink">
            Tagihan per Periode
          </h2>
          {periods.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-faint">
              Belum ada tagihan diterbitkan.
            </p>
          ) : (
            <div className="divide-y divide-black/5">
              {periods.map((p) => (
                <div
                  key={`${p.year}-${p.month}`}
                  className="flex items-center gap-3 py-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-ink">
                      {formatPeriod(p.year, p.month)}
                    </p>
                    <p className="text-[11px] text-ink-faint">
                      {p.paid}/{p.count} rumah lunas
                    </p>
                  </div>
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-black/5">
                    <div
                      className="h-full rounded-full bg-pelican-500"
                      style={{
                        width: `${p.count ? (p.paid / p.count) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <p className="w-28 text-right text-sm font-bold text-ink">
                    {formatRupiah(p.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate bills */}
      <div>
        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Terbitkan Tagihan</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Membuat tagihan IPL untuk {payIplCount} rumah sesuai nominal
            masing-masing.
          </p>
          <ActionForm action={generateBills} className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Periode
              </label>
              <input
                type="month"
                name="period"
                defaultValue={nextPeriod}
                required
                className="input"
              />
            </div>
            <button type="submit" className="btn-primary w-full">
              <Icon name="check" size={18} />
              Terbitkan Tagihan
            </button>
            <p className="text-[11px] text-ink-faint">
              Tagihan yang sudah ada untuk periode tersebut tidak akan
              terduplikasi.
            </p>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
