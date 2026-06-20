"use client";

import { useMemo, useState } from "react";
import { selectHouse } from "@/app/actions";
import { Icon } from "./Icon";

type HouseLite = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
};

const naturalNo = (a: string, b: string) => {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b);
};

export function HousePicker({ houses }: { houses: HouseLite[] }) {
  const [query, setQuery] = useState("");
  const [block, setBlock] = useState("");
  const [no, setNo] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const blocks = useMemo(
    () =>
      Array.from(new Set(houses.map((h) => h.block))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      ),
    [houses]
  );

  const numbers = useMemo(
    () =>
      houses
        .filter((h) => h.block === block)
        .map((h) => h.no)
        .sort(naturalNo),
    [houses, block]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return houses
      .filter((h) => {
        if (block && h.block !== block) return false;
        if (no && h.no !== no) return false;
        if (q) {
          const match =
            (h.ownerName ?? "").toLowerCase().includes(q) ||
            `${h.block}${h.no}`.toLowerCase().includes(q) ||
            `${h.block} ${h.no}`.toLowerCase().includes(q) ||
            h.block.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const blockCmp = a.block.localeCompare(b.block, undefined, {
          numeric: true,
        });
        if (blockCmp !== 0) return blockCmp;
        return naturalNo(a.no, b.no);
      });
  }, [houses, block, no, query]);

  const showList = block !== "" || query.trim() !== "";

  return (
    <div className="flex flex-1 flex-col px-5 pb-28 pt-5">
      <div className="card space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-faint">
              Blok Rumah
            </label>
            <select
              value={block}
              onChange={(e) => {
                setBlock(e.target.value);
                setNo("");
                setSelected(null);
              }}
              className="input"
            >
              <option value="">Pilih blok</option>
              {blocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-faint">
              No Rumah
            </label>
            <select
              value={no}
              disabled={!block}
              onChange={(e) => {
                const value = e.target.value;
                setNo(value);
                const match = houses.find(
                  (h) => h.block === block && h.no === value
                );
                setSelected(match ? match.id : null);
              }}
              className="input disabled:opacity-50"
            >
              <option value="">Semua no</option>
              {numbers.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="atau cari blok, nomor, atau nama..."
            className="input pl-11"
          />
        </div>
      </div>

      {!showList ? (
        <p className="py-12 text-center text-sm text-ink-faint">
          Pilih blok rumah dulu untuk melihat daftar rumah.
        </p>
      ) : (
      <div className="mt-4 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-faint">
            Rumah tidak ditemukan.
          </p>
        ) : (
          filtered.map((h) => {
            const active = selected === h.id;
            return (
              <button
                key={h.id}
                onClick={() => setSelected(h.id)}
                className={`card flex w-full items-center gap-3 p-4 text-left transition ${
                  active ? "ring-2 ring-pelican-500" : ""
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    active
                      ? "bg-pelican-600 text-white"
                      : "bg-pelican-50 text-pelican-600"
                  }`}
                >
                  <Icon name="home" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">
                    {h.ownerName ?? `Rumah ${h.block} No. ${h.no}`}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    Blok {h.block} / No. {h.no}
                  </p>
                </div>
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
          })
        )}
      </div>
      )}

      <form action={selectHouse} className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[480px] border-t border-black/5 bg-white/90 p-4 backdrop-blur-xl">
        <input type="hidden" name="houseId" value={selected ?? ""} />
        <button type="submit" disabled={!selected} className="btn-primary w-full">
          Masuk sebagai warga ini
          <Icon name="arrow-right" size={18} />
        </button>
      </form>
    </div>
  );
}
