import { BottomNav } from "@/components/BottomNav";
import { Icon } from "@/components/Icon";
import { PageHeader } from "@/components/PageHeader";
import { IplTakeoverCard } from "@/components/IplTakeoverCard";
import { getSelectedHouse } from "@/lib/session";
import { getTakeoverForHouse } from "@/lib/iplTakeover";
import { snapJsUrl, getClientKey } from "@/lib/midtrans";
import Script from "next/script";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function IplTakeoverPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const ownerName = house.ownerName ?? `Rumah ${house.block} No. ${house.no}`;
  const takeover = await getTakeoverForHouse(house.id);
  const hasTakeover = !!takeover && takeover.totalAmount > 0;

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader
        title="IPL Takeover"
        subtitle={`Blok ${house.block} / No. ${house.no}`}
      />

      {/* Property info */}
      <section className="-mt-2 px-5">
        <div className="card flex items-center gap-3 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Icon name="home" size={24} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">{ownerName}</p>
            <p className="text-xs text-ink-faint">
              Blok {house.block} / No. {house.no}
            </p>
          </div>
          <span className="chip">{house.occupied ? "Dihuni" : "Kosong"}</span>
        </div>
      </section>

      {hasTakeover ? (
        <IplTakeoverCard
          total={takeover.totalAmount}
          paid={takeover.paid}
          pending={takeover.pending}
          remaining={takeover.remaining}
        />
      ) : (
        <section className="px-5 pt-4">
          <div className="card flex flex-col items-center gap-2 p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Icon name="check" size={26} />
            </div>
            <p className="text-sm font-bold text-ink">
              Tidak ada tunggakan IPL Takeover
            </p>
            <p className="text-xs text-ink-faint">
              Rumah ini tidak memiliki tunggakan IPL sebelum 2025 yang perlu
              dibayarkan.
            </p>
          </div>
        </section>
      )}

      <Script
        src={snapJsUrl()}
        data-client-key={getClientKey()}
        strategy="afterInteractive"
      />

      <BottomNav />
    </main>
  );
}
