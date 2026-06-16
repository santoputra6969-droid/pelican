"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Icon } from "@/components/Icon";
import { setIplAmountForHouses } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";
import { formatRupiah } from "@/lib/format";

type House = {
  id: number;
  block: string;
  no: string;
  iplAmount: number;
  payIpl: boolean;
};

function naturalNo(a: string, b: string) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b);
  return na - nb;
}

export function IplPerHouseManager({ houses }: { houses: House[] }) {
  const [block, setBlock] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [amount, setAmount] = useState<string>("");

  const blocks = useMemo(
    () =>
      Array.from(new Set(houses.map((h) => h.block))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [houses]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return houses
      .filter((h) => (block ? h.block === block : true))
      .filter((h) => (q ? h.no.toLowerCase().includes(q) : true))
      .sort((a, b) =>
        a.block === b.block
          ? naturalNo(a.no, b.no)
          : a.block.localeCompare(b.block, undefined, { numeric: true })
      );
  }, [houses, block, query]);

  // group filtered by block for display
  const grouped = useMemo(() => {
    const map = new Map<string, House[]>();
    for (const h of filtered) {
      if (!map.has(h.block)) map.set(h.block, []);
      map.get(h.block)!.push(h);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const filteredIds = useMemo(() => filtered.map((h) => h.id), [filtered]);
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleBlock(ids: number[], on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (on ? next.add(id) : next.delete(id)));
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filteredIds.forEach((id) => next.delete(id));
      else filteredIds.forEach((id) => next.add(id));
      return next;
    });
  }

  const selectedList = useMemo(
    () => houses.filter((h) => selected.has(h.id)),
    [houses, selected]
  );

  const distinctAmounts = useMemo(
    () => Array.from(new Set(houses.map((h) => h.iplAmount))),
    [houses]
  );

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-ink">Nominal IPL per Rumah</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Pilih beberapa rumah, lalu terapkan nominal khusus untuk rumah-rumah
            tersebut.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
          {distinctAmounts.length > 1
            ? `${distinctAmounts.length} variasi nominal`
            : "Semua sama"}
        </span>
      </div>

      {/* Filter */}
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Blok
          </label>
          <select
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            className="input appearance-none"
          >
            <option value="">Semua Blok</option>
            {blocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Cari No. Rumah
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="cth: 12"
            className="input"
          />
        </div>
      </div>

      {/* Select all */}
      <div className="mt-4 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink-soft">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAllFiltered}
            className="h-4 w-4 accent-pelican-600"
          />
          Pilih semua ({filtered.length})
        </label>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-[11px] font-semibold text-pelican-600"
          >
            Bersihkan pilihan
          </button>
        )}
      </div>

      {/* House list grouped by block */}
      <div className="mt-3 max-h-[360px] divide-y divide-black/5 overflow-y-auto rounded-2xl border border-black/5">
        {grouped.length === 0 && (
          <p className="p-6 text-center text-sm text-ink-faint">
            Tidak ada rumah.
          </p>
        )}
        {grouped.map(([blk, list]) => {
          const ids = list.map((h) => h.id);
          const allSel = ids.every((id) => selected.has(id));
          return (
            <div key={blk}>
              <label className="sticky top-0 z-10 flex items-center gap-2 bg-black/[0.03] px-4 py-2 text-xs font-bold text-ink-soft backdrop-blur">
                <input
                  type="checkbox"
                  checked={allSel}
                  onChange={(e) => toggleBlock(ids, e.target.checked)}
                  className="h-4 w-4 accent-pelican-600"
                />
                {blk} · {list.length} rumah
              </label>
              <div className="grid grid-cols-2 gap-x-2 sm:grid-cols-3">
                {list.map((h) => {
                  const checked = selected.has(h.id);
                  return (
                    <label
                      key={h.id}
                      className={`flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm transition ${
                        checked ? "bg-pelican-50/60" : "hover:bg-black/[0.015]"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(h.id)}
                        className="h-4 w-4 accent-pelican-600"
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">
                          No. {h.no}
                        </span>
                        <span className="block text-[11px] text-ink-faint">
                          {formatRupiah(h.iplAmount)}
                          {!h.payIpl && " · non-IPL"}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply nominal */}
      <ActionForm
        action={setIplAmountForHouses}
        onSuccess={() => {
          setSelected(new Set());
          setAmount("");
        }}
        className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/5 pt-4"
      >
        <input
          type="hidden"
          name="houseIds"
          value={selectedList.map((h) => h.id).join(",")}
        />
        <div className="min-w-[180px] flex-1">
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
            Nominal untuk {selected.size} rumah terpilih (Rp)
          </label>
          <input
            name="amount"
            type="number"
            min={0}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="cth: 300000"
            className="input"
          />
        </div>
        <ApplyButton disabled={selected.size === 0 || amount === ""} count={selected.size} />
      </ActionForm>
    </div>
  );
}

function ApplyButton({ disabled, count }: { disabled: boolean; count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="btn-primary disabled:opacity-50"
    >
      <Icon name="check" size={18} />
      {pending ? "Menyimpan..." : `Terapkan ke ${count} rumah`}
    </button>
  );
}
