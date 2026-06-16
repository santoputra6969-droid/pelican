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

export function HousePicker({ houses }: { houses: HouseLite[] }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return houses.filter(
      (h) =>
        (h.ownerName ?? "").toLowerCase().includes(q) ||
        `${h.block}${h.no}`.toLowerCase().includes(q) ||
        `${h.block} ${h.no}`.toLowerCase().includes(q) ||
        h.block.toLowerCase().includes(q)
    );
  }, [houses, query]);

  return (
    <div className="flex flex-1 flex-col px-5 pb-28 pt-5">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
          <Icon name="search" size={18} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari blok, nomor, atau nama..."
          className="input pl-11"
        />
      </div>

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
