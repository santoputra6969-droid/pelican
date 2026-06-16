"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminLogout } from "@/app/admin/actions";
import { Icon, type IconName } from "@/components/Icon";

const nav: { label: string; href: string; icon: IconName }[] = [
  { label: "Dashboard", href: "/admin", icon: "grid" },
  { label: "Harga IPL", href: "/admin/ipl", icon: "home-pay" },
  { label: "Informasi", href: "/admin/informasi", icon: "megaphone" },
  { label: "Banner", href: "/admin/banner", icon: "park" },
  { label: "Transaksi", href: "/admin/transaksi", icon: "receipt" },
  { label: "Buku Kas", href: "/admin/bukukas", icon: "wallet" },
  { label: "Tunggakan", href: "/admin/tunggakan", icon: "swap" },
  { label: "Pengaduan", href: "/admin/pengaduan", icon: "chat" },
  { label: "Kelola Surat", href: "/admin/surat", icon: "send" },
  { label: "Voting", href: "/admin/vote", icon: "check" },
  { label: "Kontribusi", href: "/admin/kontribusi", icon: "heart" },
  { label: "Arsip", href: "/admin/arsip", icon: "history" },
  { label: "Data Warga", href: "/admin/warga", icon: "user" },
];

export function AdminSidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col border-b border-black/5 bg-white lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-extrabold text-pelican-700">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-600 text-white">
          P
        </span>
        <span className="hidden sm:inline">Puri Pelican</span>
        <span className="ml-1 rounded-full bg-pelican-50 px-2 py-0.5 text-[10px] font-bold text-pelican-600">
          Admin
        </span>
      </div>

      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-3 lg:pb-0">
        {nav.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-pelican-600 text-white shadow-glow"
                  : "text-ink-soft hover:bg-pelican-50 hover:text-pelican-700"
              }`}
            >
              <Icon name={item.icon} size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden border-t border-black/5 p-3 lg:block">
        <div className="mb-2 flex items-center gap-2.5 px-2 py-1.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pelican-100 text-sm font-bold text-pelican-700">
            {adminName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">
              {adminName}
            </p>
            <p className="text-[11px] text-ink-faint">Pengelola</p>
          </div>
        </div>
        <form action={adminLogout}>
          <button
            type="submit"
            className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-red-500 transition hover:bg-red-50"
          >
            <Icon name="arrow-left" size={18} />
            Keluar
          </button>
        </form>
      </div>
    </aside>
  );
}
