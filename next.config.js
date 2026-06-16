/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Foto KTP/KK dari HP bisa 2-5 MB. Default Next.js hanya 1 MB sehingga
      // upload gagal ("Terjadi kesalahan"). Form bisa mengirim KTP + KK
      // sekaligus (maks 5 MB/file), jadi beri ruang ~12 MB.
      bodySizeLimit: "12mb",
    },
  },
};

module.exports = nextConfig;
