"use client";

import { Icon } from "@/components/Icon";
import { generateBills } from "@/app/admin/actions";
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
  periods,
}: {
  periods: Period[];
}) {
  const nextPeriod = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Recent generated periods */}
      <div className="card p-5 lg:col-span-2">
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
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-3"
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
                  <p className="text-sm font-bold text-ink sm:w-28 sm:text-right">
                    {formatRupiah(p.total)}
                  </p>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Generate bills */}
      <div>
        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Terbitkan Tagihan</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Membuat tagihan IPL untuk rumah yang wajib IPL, sesuai nominal
            per rumah.
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
