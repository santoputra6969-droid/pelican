import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import {
  createAdminAccount,
  resetAdminPassword,
  setCommunityFeeConfig,
  toggleAdminAccess,
} from "@/app/admin/actions";
import { formatDate, formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

function mode(values: number[]) {
  if (values.length === 0) return 0;
  const map = new Map<number, number>();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  let best = values[0];
  let bestCount = 0;
  for (const [k, c] of map) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  return best;
}

export default async function AdminPengaturanPage() {
  const currentAdmin = await requireAdmin();
  const [houses, admins] = await Promise.all([
    prisma.house.findMany({
    select: {
      payCash: true,
      cashAmount: true,
      payPkk: true,
      pkkAmount: true,
      payIpl: true,
      iplAmount: true,
    },
    }),
    prisma.admin.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, username: true, role: true, createdAt: true },
    }),
  ]);

  const cashActive = houses.filter((h) => h.payCash).length;
  const pkkActive = houses.filter((h) => h.payPkk).length;
  const iplActive = houses.filter((h) => h.payIpl).length;

  const cashMode = mode(houses.map((h) => h.cashAmount ?? 0).filter((n) => n > 0));
  const pkkMode = mode(houses.map((h) => h.pkkAmount ?? 0).filter((n) => n > 0));
  const iplMode = mode(houses.map((h) => h.iplAmount ?? 0).filter((n) => n > 0));

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Pengaturan"
        subtitle="Atur konfigurasi iuran global agar modul tunggakan & sistag konsisten"
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Rumah Wajib IPL</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{iplActive}</p>
          <p className="text-xs text-ink-soft">Nominal umum {formatRupiah(iplMode)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Rumah Wajib Kas</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{cashActive}</p>
          <p className="text-xs text-ink-soft">Nominal umum {formatRupiah(cashMode)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Rumah Wajib PKK</p>
          <p className="mt-1 text-2xl font-extrabold text-ink">{pkkActive}</p>
          <p className="text-xs text-ink-soft">Nominal umum {formatRupiah(pkkMode)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Kelola per Rumah</p>
          <p className="mt-1 text-sm font-semibold text-ink">Atur pengecualian & data rumah</p>
          <Link href="/admin/warga" className="mt-2 inline-block text-sm font-semibold text-pelican-700 hover:underline">
            Buka Data Warga
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Pengaturan Kas</h2>
          <p className="mt-1 text-xs text-ink-soft">Terapkan ke semua rumah sebagai default global.</p>
          <ActionForm action={setCommunityFeeConfig} className="mt-4 space-y-3">
            <input type="hidden" name="feeType" value="KAS" />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="enabled" defaultChecked={cashActive > 0} className="h-4 w-4 accent-pelican-600" />
              Aktifkan kewajiban iuran Kas untuk semua rumah
            </label>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Nominal Kas / bulan (Rp)</label>
              <input name="amount" type="number" min={0} defaultValue={cashMode || 20000} className="input" />
            </div>
            <button type="submit" className="btn-primary w-full">Simpan Pengaturan Kas</button>
          </ActionForm>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Pengaturan PKK</h2>
          <p className="mt-1 text-xs text-ink-soft">Terapkan ke semua rumah sebagai default global.</p>
          <ActionForm action={setCommunityFeeConfig} className="mt-4 space-y-3">
            <input type="hidden" name="feeType" value="PKK" />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" name="enabled" defaultChecked={pkkActive > 0} className="h-4 w-4 accent-pelican-600" />
              Aktifkan kewajiban iuran PKK untuk semua rumah
            </label>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Nominal PKK / bulan (Rp)</label>
              <input name="amount" type="number" min={0} defaultValue={pkkMode || 5000} className="input" />
            </div>
            <button type="submit" className="btn-primary w-full">Simpan Pengaturan PKK</button>
          </ActionForm>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Tambah Login Pengurus</h2>
          <p className="mt-1 text-xs text-ink-soft">
            Buat akun baru agar beberapa pengurus bisa login dengan username dan kata sandi masing-masing.
          </p>
          <ActionForm action={createAdminAccount} className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Nama Pengurus</label>
              <input name="name" className="input" required placeholder="Contoh: Admin B" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Username</label>
              <input
                name="username"
                className="input"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9._-]+"
                placeholder="contoh: adminb"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Kata Sandi</label>
              <input name="password" type="password" className="input" required minLength={6} />
            </div>
            <button type="submit" className="btn-primary w-full">Tambah Login Pengurus</button>
          </ActionForm>
        </div>

        <div className="card p-5">
          <h2 className="text-base font-bold text-ink">Daftar Login Pengurus</h2>
          <p className="mt-1 text-xs text-ink-soft">Kelola status aktif akun dan reset kata sandi per pengurus.</p>

          <ActionForm action={resetAdminPassword} className="mt-4 space-y-3 rounded-2xl border border-black/5 p-3">
            <p className="text-xs font-semibold text-ink-soft">Reset Kata Sandi Pengurus</p>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Akun Pengurus</label>
              <select name="adminId" className="input" required>
                <option value="">Pilih akun</option>
                {admins.map((a) => (
                  <option key={`reset-${a.id}`} value={a.id}>
                    @{a.username} - {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Kata Sandi Baru</label>
              <input name="password" type="password" className="input" required minLength={6} />
            </div>
            <button type="submit" className="btn-primary w-full">Reset Kata Sandi</button>
          </ActionForm>

          <div className="mt-4 divide-y divide-black/5 rounded-2xl border border-black/5">
            {admins.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-semibold text-ink">{a.name}</p>
                  <p className="text-xs text-ink-faint">@{a.username} {a.id === currentAdmin.id ? "(Anda)" : ""}</p>
                </div>
                <div className="text-right text-[11px] text-ink-faint">
                  <p className={`font-semibold uppercase ${a.role === "admin" ? "text-pelican-700" : "text-red-500"}`}>
                    {a.role === "admin" ? "AKTIF" : "NONAKTIF"}
                  </p>
                  <p>{formatDate(a.createdAt)}</p>
                  <ActionForm action={toggleAdminAccess} className="mt-2">
                    <input type="hidden" name="adminId" value={a.id} />
                    <button
                      type="submit"
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        a.role === "admin"
                          ? "bg-red-50 text-red-600"
                          : "bg-pelican-50 text-pelican-700"
                      }`}
                    >
                      {a.role === "admin" ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  </ActionForm>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
