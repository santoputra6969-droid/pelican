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
  { id: "m2", label: "Bayar Kas", icon: "wallet", href: "/bayar-kas", accent: "#0ea5e9" },
  { id: "m3", label: "Bayar PKK", icon: "heart", href: "/bayar-pkk", accent: "#ec4899" },
  { id: "m4", label: "Daftar Transaksi", icon: "receipt", href: "/transaksi", accent: "#8b5cf6" },
  { id: "m5", label: "Pengkinian Data", icon: "user-edit", href: "/resident/form", accent: "#0ea5e9" },
  { id: "m6", label: "Informasi", icon: "megaphone", href: "/informasi", accent: "#0891b2" },
  { id: "m7", label: "Profil Rumah", icon: "user-edit", href: "/profil", accent: "#f59e0b" },
  { id: "m8", label: "Ajukan Surat", icon: "receipt", href: "/surat", accent: "#0ea5e9" },
  { id: "m9", label: "Lapor Warga", icon: "megaphone", href: "/pengaduan", accent: "#f97316" },
  { id: "m10", label: "Voting Warga", icon: "check", href: "/vote", accent: "#ec4899" },
  { id: "m11", label: "Kontribusi", icon: "heart", href: "/kontribusi", accent: "#e11d48" },
  { id: "m12", label: "Bantuan", icon: "help", href: "/menu", accent: "#94a3b8" },
];

export const allMenu: MenuItem[] = [
  ...mainMenu,
];
