import type { IconName } from "@/components/Icon";

export type MenuItem = {
  id: string;
  label: string;
  icon: IconName;
  href: string;
  badge?: string;
  accent: string;
};

export const mainMenu: MenuItem[] = [
  { id: "m1", label: "Bayar IPL", icon: "home-pay", href: "/bayar-ipl", accent: "#16bd7c", badge: "Tagihan" },
  { id: "m2", label: "Daftar Transaksi", icon: "receipt", href: "/transaksi", accent: "#8b5cf6" },
  { id: "m3", label: "Informasi", icon: "megaphone", href: "/informasi", accent: "#0891b2" },
  { id: "m4", label: "Profil Rumah", icon: "user-edit", href: "/profil", accent: "#f59e0b" },
  { id: "m5", label: "Ajukan Surat", icon: "receipt", href: "/surat", accent: "#0ea5e9" },
  { id: "m6", label: "Lapor Warga", icon: "megaphone", href: "/pengaduan", accent: "#f97316" },
  { id: "m7", label: "Voting Warga", icon: "check", href: "/vote", accent: "#ec4899" },
  { id: "m8", label: "Semua Menu", icon: "grid", href: "/menu", accent: "#64748b" },
];

export const allMenu: MenuItem[] = [
  ...mainMenu.slice(0, 7),
  { id: "a1", label: "Kontribusi", icon: "heart", href: "/kontribusi", accent: "#e11d48" },
  { id: "a2", label: "Fasilitas Umum", icon: "park", href: "/menu", accent: "#22c55e" },
  { id: "a3", label: "Booking Aula", icon: "calendar", href: "/menu", accent: "#6366f1" },
  { id: "a4", label: "Marketplace", icon: "cart", href: "/menu", accent: "#14b8a6" },
  { id: "a5", label: "Pengaduan", icon: "chat", href: "/pengaduan", accent: "#eab308" },
  { id: "a6", label: "Bantuan", icon: "help", href: "/menu", accent: "#94a3b8" },
];
