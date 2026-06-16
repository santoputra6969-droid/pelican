import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    houseCount,
    unpaid,
    balance,
    infoCount,
    bannerCount,
    newComplaints,
    recentTx,
  ] = await Promise.all([
    prisma.house.count(),
    prisma.bill.aggregate({
      where: { status: "UNPAID" },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.balance.findFirst({ orderBy: { id: "asc" } }),
    prisma.information.count({ where: { published: true } }),
    prisma.banner.count({ where: { active: true } }),
    prisma.complaint.count({ where: { status: "BARU" } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  const stats: {
    label: string;
    value: string;
    icon: IconName;
    accent: string;
    href: string;
  }[] = [
    {
      label: "Total Rumah",
      value: String(houseCount),
      icon: "user",
      accent: "#16bd7c",
      href: "/admin/warga",
    },
    {
      label: "Tagihan Belum Bayar",
      value: formatRupiah(unpaid._sum.amount ?? 0),
      icon: "home-pay",
      accent: "#ef4444",
      href: "/admin/ipl",
    },
    {
      label: "Saldo Kas Cluster",
      value: formatRupiah(balance?.balance ?? 0),
      icon: "wallet",
      accent: "#0891b2",
      href: "/admin/transaksi",
    },
    {
      label: "Info & Banner Aktif",
      value: `${infoCount} / ${bannerCount}`,
      icon: "megaphone",
      accent: "#8b5cf6",
      href: "/admin/informasi",
    },
    {
      label: "Pengaduan Baru",
      value: String(newComplaints),
      icon: "chat",
      accent: "#eab308",
      href: "/admin/pengaduan",
    },
  ];

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Dashboard"
        subtitle="Ringkasan aktivitas komunitas Puri Pelican"
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card p-4 transition hover:shadow-soft lg:p-5"
          >
            <span
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${s.accent}1a`, color: s.accent }}
            >
              <Icon name={s.icon} size={20} />
            </span>
            <p className="mt-3 text-lg font-extrabold text-ink lg:text-xl">
              {s.value}
            </p>
            <p className="text-xs text-ink-faint">{s.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink">Transaksi Terbaru</h2>
            <Link
              href="/admin/transaksi"
              className="text-xs font-semibold text-pelican-600"
            >
              Lihat semua
            </Link>
          </div>
          {recentTx.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-faint">
              Belum ada transaksi.
            </p>
          ) : (
            <div className="divide-y divide-black/5">
              {recentTx.map((t) => {
                const masuk = t.mutation === "DEBIT";
                return (
                  <div key={t.id} className="flex items-center gap-3 py-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                        masuk
                          ? "bg-pelican-50 text-pelican-600"
                          : "bg-red-50 text-red-500"
                      }`}
                    >
                      <Icon
                        name="arrow-right"
                        size={18}
                        className={masuk ? "rotate-90" : "-rotate-90"}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {t.type ?? (masuk ? "Pemasukan" : "Pengeluaran")}
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">
                        {t.notes ?? formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        masuk ? "text-pelican-700" : "text-red-500"
                      }`}
                    >
                      {masuk ? "+" : "−"}
                      {formatRupiah(t.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-2.5 p-5">
          <h2 className="mb-1 text-base font-bold text-ink">Aksi Cepat</h2>
          <QuickLink href="/admin/ipl" icon="home-pay" label="Atur IPL & Terbitkan Tagihan" />
          <QuickLink href="/admin/informasi" icon="megaphone" label="Tambah Informasi" />
          <QuickLink href="/admin/banner" icon="park" label="Kelola Banner" />
          <QuickLink href="/admin/warga" icon="user" label="Kelola Data Rumah" />
        </div>
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-black/5 p-3 transition hover:border-pelican-200 hover:bg-pelican-50/50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex-1 text-sm font-semibold text-ink">{label}</span>
      <Icon name="chevron-right" size={18} className="text-ink-faint" />
    </Link>
  );
}
