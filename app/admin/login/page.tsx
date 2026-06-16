import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand side */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-pelican-800 via-pelican-700 to-pelican-600 p-12 text-white lg:flex">
        <div className="absolute -left-16 top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-bold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            P
          </span>
          Puri Pelican
        </div>
        <div className="relative">
          <h1 className="text-3xl font-extrabold leading-tight">
            Panel Pengelola
          </h1>
          <p className="mt-3 max-w-sm text-white/80">
            Kelola tagihan IPL, informasi warga, banner, dan data hunian dalam
            satu dashboard.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Puri Pelican. Aplikasi Warga.
        </p>
      </div>

      {/* Form side */}
      <div className="flex items-center justify-center bg-[var(--background)] p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-bold text-pelican-700 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pelican-600 text-white">
              P
            </span>
            Puri Pelican
          </div>
          <h2 className="text-2xl font-extrabold text-ink">Masuk Admin</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Gunakan kredensial pengelola Anda.
          </p>

          <AdminLoginForm next={next} />

          <div className="mt-6 rounded-2xl bg-pelican-50 p-4 text-xs text-pelican-700">
            <p className="font-semibold">Akun demo</p>
            <p className="mt-1">username: admin · password: admin123</p>
          </div>
        </div>
      </div>
    </main>
  );
}
