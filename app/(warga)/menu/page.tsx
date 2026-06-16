"use client";

import Link from "next/link";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { allMenu } from "@/lib/menu";

export default function MenuPage() {
  const [query, setQuery] = useState("");

  const filtered = allMenu.filter((m) =>
    m.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <main className="flex min-h-screen flex-col pb-24">
      <PageHeader title="Semua Menu" subtitle="Layanan lengkap warga" />

      <section className="-mt-2 px-5">
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari layanan..."
            className="input pl-11"
          />
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="card p-5">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-faint">
              Layanan tidak ditemukan.
            </p>
          ) : (
            <div className="grid grid-cols-4 gap-x-2 gap-y-6">
              {filtered.map((m) => (
                <Link
                  key={m.id}
                  href={m.href}
                  className="group flex flex-col items-center gap-2 text-center"
                >
                  <span
                    className="flex h-14 w-14 items-center justify-center rounded-2xl transition group-active:scale-90"
                    style={{
                      backgroundColor: `${m.accent}1a`,
                      color: m.accent,
                    }}
                  >
                    <Icon name={m.icon} size={26} />
                  </span>
                  <span className="text-[11px] font-medium leading-tight text-ink-soft">
                    {m.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 px-5">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-pelican-700 to-pelican-500 p-5 text-white">
          <h3 className="text-base font-bold">Butuh bantuan?</h3>
          <p className="mt-1 text-sm text-white/80">
            Tim pengelola siap membantu setiap hari, 08.00 - 20.00 WIB.
          </p>
          <button className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-bold text-pelican-700">
            <Icon name="chat" size={14} />
            Hubungi Pengelola
          </button>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
