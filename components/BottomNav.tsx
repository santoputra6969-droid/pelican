"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, type IconName } from "./Icon";

const items: { label: string; icon: IconName; href: string }[] = [
  { label: "Beranda", icon: "home", href: "/" },
  { label: "Transaksi", icon: "history", href: "/transaksi" },
  { label: "Bayar", icon: "scan", href: "/bayar-ipl" },
  { label: "Informasi", icon: "bell", href: "/informasi" },
  { label: "Profil", icon: "user", href: "/profil" },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="sticky bottom-0 z-30 mt-auto">
      <div className="pointer-events-none absolute -top-6 h-6 w-full bg-gradient-to-t from-[var(--background)] to-transparent" />
      <div className="relative grid grid-cols-5 items-end border-t border-black/5 bg-white/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl">
        {items.map((item, idx) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const isCenter = idx === 2;

          if (isCenter) {
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center"
                aria-label={item.label}
              >
                <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-pelican-600 text-white shadow-glow transition active:scale-95">
                  <Icon name={item.icon} size={26} />
                </span>
                <span className="mt-1 text-[10px] font-semibold text-pelican-700">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 py-1.5"
            >
              <Icon
                name={item.icon}
                size={22}
                className={active ? "text-pelican-600" : "text-ink-faint"}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span
                className={`text-[10px] font-medium ${
                  active ? "text-pelican-700" : "text-ink-faint"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
