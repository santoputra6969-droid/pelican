"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";

type ArchiveItem = {
  id: string;
  title: string;
  category: string;
  fileId: string;
  createdAt: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  LAPORAN: "Laporan",
  NOTULEN: "Notulen",
  SK: "SK",
  UMUM: "Umum",
};

export function ArsipList({ archives }: { archives: ArchiveItem[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return archives;
    return archives.filter((a) => a.title.toLowerCase().includes(q));
  }, [archives, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
          <Icon name="search" size={18} />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari judul dokumen..."
          className="input pl-11"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 p-12 text-center">
          <Icon name="archive" size={40} className="text-ink-faint" />
          <p className="text-sm font-semibold text-ink">Dokumen tidak ditemukan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <a
              key={a.id}
              href={`/files/archive/${a.fileId}`}
              target="_blank"
              rel="noreferrer"
              className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                <Icon name="archive" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700">
                    {CATEGORY_LABEL[a.category] ?? a.category}
                  </span>
                  <span className="text-[11px] text-ink-faint">{formatDate(a.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-bold text-ink">{a.title}</p>
              </div>
              <Icon name="chevron-right" size={18} className="shrink-0 text-ink-faint" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
