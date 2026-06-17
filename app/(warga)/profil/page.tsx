import { redirect } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { prisma } from "@/lib/prisma";
import { getSelectedHouse } from "@/lib/session";
import { clearHouse } from "@/app/actions";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth() + 1;

  const dueUnpaidWhere = {
    houseId: house.id,
    status: "UNPAID" as const,
    OR: [
      { year: { lt: nowYear } },
      { year: nowYear, month: { lte: nowMonth } },
    ],
  };

  const [paidCount, unpaid] = await Promise.all([
    prisma.bill.count({
      where: { houseId: house.id, status: "PAID" },
    }),
    prisma.bill.aggregate({
      where: dueUnpaidWhere,
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const ownerName = house.ownerName ?? `Rumah ${house.block} No. ${house.no}`;
  const initials = ownerName
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Profil Rumah" subtitle="Data hunian Anda" />

      {/* Identity */}
      <section className="-mt-2 px-5">
        <div className="card flex flex-col items-center p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-pelican-600 text-2xl font-bold text-white">
            {initials}
          </div>
          <h2 className="mt-3 text-lg font-bold text-ink">{ownerName}</h2>
          <p className="text-sm text-ink-faint">
            Blok {house.block} / No. {house.no}
          </p>
          <span className="chip mt-2">
            {house.occupied
              ? house.occupiedByOwner
                ? "Dihuni Pemilik"
                : "Dihuni Penyewa"
              : "Kosong"}
          </span>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-5 px-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <p className="text-2xl font-extrabold text-pelican-700">
              {paidCount}
            </p>
            <p className="text-xs text-ink-faint">IPL lunas</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-2xl font-extrabold text-red-500">
              {unpaid._count}
            </p>
            <p className="text-xs text-ink-faint">Tagihan belum bayar</p>
          </div>
        </div>
      </section>

      {/* Detail */}
      <section className="mt-5 px-5">
        <div className="card divide-y divide-black/5">
          <DetailRow icon="user" label="Nama Pemilik" value={ownerName} />
          <DetailRow icon="home" label="Blok" value={house.block} />
          <DetailRow icon="grid" label="Nomor Rumah" value={house.no} />
          <DetailRow
            icon="home-pay"
            label="Iuran IPL / bulan"
            value={formatRupiah(house.iplAmount)}
          />
          <DetailRow
            icon="shield"
            label="Status Hunian"
            value={house.occupied ? "Dihuni" : "Kosong"}
          />
        </div>
      </section>

      {unpaid._sum.amount ? (
        <section className="mt-5 px-5">
          <Link
            href="/bayar-ipl"
            className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500">
              <Icon name="home-pay" size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Tagihan menunggu</p>
              <p className="text-xs text-ink-faint">
                {formatRupiah(unpaid._sum.amount)} belum dibayar
              </p>
            </div>
            <Icon name="chevron-right" size={20} className="text-ink-faint" />
          </Link>
        </section>
      ) : null}

      <section className="mt-5 px-5">
        <Link
          href="/resident/form"
          className="card flex items-center gap-3 p-4 transition active:scale-[0.99]"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Icon name="user-edit" size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Pengkinian Data Warga</p>
            <p className="text-xs text-ink-faint">
              Lengkapi data KK dan informasi penghuni rumah
            </p>
          </div>
          <Icon name="chevron-right" size={20} className="text-ink-faint" />
        </Link>
      </section>

      {/* Ganti rumah */}
      <section className="mt-5 px-5 pb-8">
        <form action={clearHouse}>
          <button type="submit" className="btn-ghost w-full">
            <Icon name="swap" size={18} />
            Ganti Rumah
          </button>
        </form>
        <p className="mt-3 text-center text-[11px] text-ink-faint">
          Puri Pelican · Aplikasi Warga
        </p>
      </section>

      <BottomNav />
    </main>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-50 text-pelican-600">
        <Icon name={icon} size={18} />
      </span>
      <span className="flex-1 text-sm text-ink-soft">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
