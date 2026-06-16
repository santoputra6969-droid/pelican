import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/Icon";
import { AutoRefresh } from "@/components/AutoRefresh";
import { formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BayarSelesaiPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  const payment = order_id
    ? await prisma.payment.findUnique({ where: { orderId: order_id } })
    : null;

  const status = payment?.status ?? "UNKNOWN";
  const pending = status === "PENDING";

  const ui = (() => {
    switch (status) {
      case "PAID":
        return {
          icon: "check" as const,
          tone: "bg-pelican-100 text-pelican-600",
          title: "Pembayaran Berhasil",
          desc: `Pembayaran IPL sebesar ${formatRupiah(
            payment?.amount ?? 0
          )} telah kami terima. Terima kasih!`,
        };
      case "PENDING":
        return {
          icon: "history" as const,
          tone: "bg-amber-100 text-amber-600",
          title: "Menunggu Pembayaran",
          desc: "Kami sedang menunggu konfirmasi pembayaran Anda. Halaman ini akan diperbarui otomatis.",
        };
      case "EXPIRED":
        return {
          icon: "history" as const,
          tone: "bg-red-100 text-red-500",
          title: "Pembayaran Kedaluwarsa",
          desc: "Waktu pembayaran sudah habis. Silakan buat pembayaran baru.",
        };
      case "CANCEL":
      case "FAILED":
        return {
          icon: "plus" as const,
          tone: "bg-red-100 text-red-500",
          title: "Pembayaran Gagal",
          desc: "Pembayaran tidak berhasil diproses. Silakan coba lagi.",
        };
      default:
        return {
          icon: "receipt" as const,
          tone: "bg-slate-100 text-slate-500",
          title: "Pembayaran Tidak Ditemukan",
          desc: "Data pembayaran tidak ditemukan. Cek riwayat transaksi Anda.",
        };
    }
  })();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16 text-center">
      {pending && <AutoRefresh />}

      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full ${ui.tone}`}
      >
        <Icon name={ui.icon} size={40} />
      </div>
      <h1 className="mt-5 text-xl font-extrabold text-ink">{ui.title}</h1>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">{ui.desc}</p>

      {payment && (
        <p className="mt-3 text-[11px] text-ink-faint">
          ID Pesanan: {payment.orderId}
        </p>
      )}

      <div className="mt-8 w-full max-w-xs space-y-2">
        {status === "PAID" && (
          <Link href="/transaksi" className="btn-primary w-full">
            Lihat Transaksi
          </Link>
        )}
        {(status === "EXPIRED" ||
          status === "CANCEL" ||
          status === "FAILED" ||
          status === "UNKNOWN") && (
          <Link href="/bayar-ipl" className="btn-primary w-full">
            Coba Bayar Lagi
          </Link>
        )}
        <Link
          href="/"
          className="block text-sm font-semibold text-ink-faint"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
