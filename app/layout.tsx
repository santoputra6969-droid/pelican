import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Puri Pelican — Aplikasi Warga",
  description:
    "Satu aplikasi untuk kebutuhan warga Puri Pelican: bayar IPL, saldo Pelican, transaksi, dan informasi komunitas.",
  manifest: undefined,
};

export const viewport: Viewport = {
  themeColor: "#089a64",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
