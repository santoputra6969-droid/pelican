import { prisma } from "@/lib/prisma";
import { HousePicker } from "@/components/HousePicker";
import { BannerCarousel } from "@/components/BannerCarousel";

export const dynamic = "force-dynamic";

export default async function PilihRumahPage() {
  const [houses, banners] = await Promise.all([
    prisma.house.findMany({
      orderBy: [{ block: "asc" }, { no: "asc" }],
    }),
    prisma.information.findMany({
      where: { published: true, image: { not: null } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="flex min-h-screen flex-col bg-[var(--background)]">
      <header className="relative overflow-hidden bg-gradient-to-b from-pelican-700 to-pelican-600 px-6 pb-10 pt-[max(env(safe-area-inset-top),2rem)] text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <h1 className="relative text-xl font-extrabold">Selamat datang 👋</h1>
        <p className="relative mt-1 text-sm text-white/80">
          Pilih rumah hunian Anda untuk mulai menggunakan aplikasi warga Puri
          Pelican.
        </p>
      </header>

      {banners.length > 0 && (
        <section className="mt-5">
          <BannerCarousel
            banners={banners.map((b) => ({
              id: b.id,
              image: b.image || "",
            }))}
          />
        </section>
      )}

      <HousePicker
        houses={houses.map((h) => ({
          id: h.id,
          block: h.block,
          no: h.no,
          ownerName: h.ownerName,
        }))}
      />
    </main>
  );
}
