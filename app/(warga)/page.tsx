import Link from "next/link";
import { redirect } from "next/navigation";
import { BannerCarousel } from "@/components/BannerCarousel";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { formatDate, formatPeriod, formatRupiah } from "@/lib/format";
import { getCommunityFeeStatusForHouse } from "@/lib/communityFees";
import { mainMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export default async function HomePage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const [unpaidBills, banners, infos, balance, cashStatus, pkkStatus] = await Promise.all([
    prisma.bill.findMany({
      where: {
        houseId: house.id,
        status: "UNPAID",
        OR: [
          { year: { lt: nowYear } },
          { year: nowYear, month: { lte: nowMonth } },
        ],
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.banner.findMany({
      where: { active: true },
      orderBy: { order: "asc" },
    }),
    prisma.information.findMany({
      where: { published: true },
      orderBy: [{ isPin: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.balance.findFirst({ orderBy: { id: "asc" } }),
    getCommunityFeeStatusForHouse({ feeType: "KAS", houseId: house.id, includeAllYears: true }),
    getCommunityFeeStatusForHouse({ feeType: "PKK", houseId: house.id, includeAllYears: true }),
  ]);

  const totalDue = unpaidBills.reduce((s, b) => s + b.amount, 0);
  const ownerName = house.ownerName ?? `Rumah ${house.block} No. ${house.no}`;
  const initials = ownerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 overflow-hidden bg-gradient-to-b from-pelican-700 via-pelican-600 to-pelican-600 px-5 pb-6 pt-[max(env(safe-area-inset-top),1.25rem)] text-white">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold">
              {initials}
            </div>
            <div>
              <p className="text-xs text-white/70">Selamat datang,</p>
              <p className="text-base font-bold leading-tight">{ownerName}</p>
              <p className="text-[11px] text-white/70">
                Blok {house.block} / No. {house.no}
              </p>
            </div>
          </div>
          <Link
            href="/informasi"
            aria-label="Informasi"
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 transition active:scale-90"
          >
            <Icon name="bell" size={22} />
            {infos.length > 0 && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-pelican-600" />
            )}
          </Link>
        </div>
      </header>

      {/* Saldo kas card */}
      <section className="px-5 pt-5">
        <div className="card overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-faint">Saldo Kas Cluster</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">
                {formatRupiah(balance?.balance ?? 0)}
              </p>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
              <Icon name="wallet" size={24} />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl bg-pelican-50/60 px-3 py-2">
            <Icon name="shield" size={16} className="text-pelican-600" />
            <span className="text-[11px] font-medium text-ink-soft">
              Kas PKK {formatRupiah(balance?.balancePkk ?? 0)}
            </span>
            <Link
              href="/transaksi"
              className="ml-auto text-[11px] font-semibold text-pelican-600"
            >
              Lihat jurnal
            </Link>
          </div>
        </div>
      </section>

      {(cashStatus.enabled || pkkStatus.enabled) && (
        <section className="mt-4 px-5">
          <div className="card overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-faint">Iuran Kas & PKK</p>
                <p className="mt-0.5 text-2xl font-extrabold text-ink">
                  {formatRupiah(cashStatus.totalDue + pkkStatus.totalDue)}
                </p>
              </div>
              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
                {(cashStatus.dueBills.length || 0) + (pkkStatus.dueBills.length || 0)} tagihan
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/bayar-kas" className="btn-ghost">
                <Icon name="wallet" size={18} />
                Bayar Kas
              </Link>
              <Link href="/bayar-pkk" className="btn-ghost">
                <Icon name="heart" size={18} />
                Bayar PKK
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Tagihan card */}
      <section className="mt-4 px-5">
        <div className="card overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-faint">Tagihan IPL Belum Bayar</p>
              <p className="mt-0.5 text-2xl font-extrabold text-ink">
                {formatRupiah(totalDue)}
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                totalDue > 0
                  ? "bg-red-50 text-red-600"
                  : "bg-pelican-50 text-pelican-700"
              }`}
            >
              {totalDue > 0 ? `${unpaidBills.length} tagihan` : "Lunas"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link href="/bayar-ipl" className="btn-primary">
              <Icon name="home-pay" size={18} />
              Bayar IPL
            </Link>
            <Link href="/transaksi" className="btn-ghost">
              <Icon name="history" size={18} />
              Riwayat
            </Link>
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="mt-6">
        <BannerCarousel
          banners={banners.map((b) => ({ id: b.id, image: b.image }))}
        />
      </section>

      {/* Menu grid */}
      <section className="mt-6 px-5">
        <div className="card p-5">
          <div className="grid grid-cols-4 gap-x-2 gap-y-5">
            {mainMenu.map((m) => (
              <Link
                key={m.id}
                href={m.href}
                className="group flex flex-col items-center gap-2 text-center"
              >
                <span
                  className="relative flex h-14 w-14 items-center justify-center rounded-2xl transition group-active:scale-90"
                  style={{ backgroundColor: `${m.accent}1a`, color: m.accent }}
                >
                  <Icon name={m.icon} size={26} />
                  {m.badge && totalDue > 0 && m.href === "/bayar-ipl" && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-[8px] font-bold text-white">
                      {unpaidBills.length}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-medium leading-tight text-ink-soft">
                  {m.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Info terbaru */}
      <section className="mt-6 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-ink">Informasi Terbaru</h2>
          <Link
            href="/informasi"
            className="text-xs font-semibold text-pelican-600"
          >
            Lihat semua
          </Link>
        </div>
        {infos.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-faint">
            Belum ada informasi.
          </div>
        ) : (
          <div className="space-y-3">
            {infos.map((info) => (
              <Link
                key={info.id}
                href="/informasi"
                className="card flex gap-3 p-4"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pelican-50 text-pelican-600">
                  <Icon name="megaphone" size={22} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {info.isPin && <span className="chip">Disematkan</span>}
                    <span className="text-[11px] text-ink-faint">
                      {formatDate(info.createdAt)}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold text-ink">
                    {info.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                    {stripHtml(info.content)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Tagihan preview */}
      {unpaidBills.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="mb-3 text-base font-bold text-ink">Tagihan IPL Anda</h2>
          <div className="card divide-y divide-black/5">
            {unpaidBills.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <Icon name="home-pay" size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">
                    IPL {formatPeriod(b.year, b.month)}
                  </p>
                  <p className="text-[11px] text-ink-faint">Belum dibayar</p>
                </div>
                <p className="text-sm font-bold text-ink">
                  {formatRupiah(b.amount)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="h-6" />
      <BottomNav />
    </main>
  );
}
