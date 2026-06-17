import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { adminLogout } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const menus: {
    label: string;
    href: string;
    icon: IconName;
  }[] = [
    { label: "Kelola Warga", href: "/admin/warga", icon: "user" },
    { label: "Kelola Saldo", href: "/admin/transaksi", icon: "wallet" },
    { label: "Kelola Transaksi", href: "/admin/transaksi", icon: "receipt" },
    { label: "Buku Kas", href: "/admin/bukukas", icon: "apps" },
    { label: "Kelola Informasi", href: "/admin/informasi", icon: "help" },
    { label: "Kelola Arsip", href: "/admin/arsip", icon: "history" },
    { label: "Kelola Surat", href: "/admin/surat", icon: "receipt" },
    { label: "Kelola Vote", href: "/admin/vote", icon: "grid" },
    { label: "Kelola Saran", href: "/admin/pengaduan", icon: "chat" },
    { label: "Kelola Banner", href: "/admin/banner", icon: "park" },
    { label: "Kelola Kontribusi", href: "/admin/kontribusi", icon: "heart" },
    { label: "IPL Takeover", href: "/admin/ipl", icon: "swap" },
    { label: "Tunggakan IPL", href: "/admin/tunggakan", icon: "scan" },
    { label: "Tunggakan Kas", href: "/admin/tunggakan", icon: "scan" },
    { label: "Tunggakan PKK", href: "/admin/tunggakan", icon: "scan" },
    { label: "Sistag IPL", href: "/admin/tunggakan", icon: "arrow-right" },
    { label: "Sistag Kas", href: "/admin/tunggakan", icon: "arrow-right" },
    { label: "Sistag PKK", href: "/admin/tunggakan", icon: "arrow-right" },
    { label: "Pengaturan", href: "/admin/warga", icon: "shield" },
  ];

  return (
    <div className="min-h-screen bg-[#dedede] lg:bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center border-b border-black/15 bg-[#726d70] px-4 py-3 text-white shadow-sm lg:rounded-b-2xl lg:px-6">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white">
            <Icon name="home" size={18} />
          </span>
          <p className="text-3 font-semibold">Pelican</p>
        </div>
        <form action={adminLogout} className="ml-auto">
          <button
            type="submit"
            className="rounded-lg p-2 text-white/90 transition hover:bg-white/10"
            aria-label="Keluar"
            title="Keluar"
          >
            <Icon name="arrow-right" size={18} />
          </button>
        </form>
      </header>

      <section className="mx-auto w-full max-w-[520px] px-5 py-4 lg:max-w-none lg:px-8">
        <h1 className="mb-4 text-[34px] font-bold text-black">Menu Admin</h1>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {menus.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="rounded-xl bg-[#1f97ef] px-3 py-4 text-center text-black shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition hover:brightness-95 active:translate-y-px"
            >
              <span className="mx-auto flex h-8 w-8 items-center justify-center text-black">
                <Icon name={m.icon} size={22} />
              </span>
              <span className="mt-2 block text-[17px] font-semibold leading-snug">
                {m.label}
              </span>
            </Link>
          ))}
        </div>

        <div className="pb-10 pt-7 text-center">
          <Link
            href="/"
            className="text-[22px] font-semibold uppercase tracking-wide text-blue-700 underline-offset-2 hover:underline"
          >
            Ke Halaman Utama
          </Link>
        </div>
      </section>
    </div>
  );
}
