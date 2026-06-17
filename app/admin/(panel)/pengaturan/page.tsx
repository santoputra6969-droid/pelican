import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ActionForm } from "@/components/admin/ActionForm";
import { setCommunityFeeConfig } from "@/app/admin/actions";
import { formatRupiah } from "@/lib/format";
import { prisma } from "@/lib/prisma";

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
  const houses = await prisma.house.findMany({
    select: {
      payCash: true,
      cashAmount: true,
      payPkk: true,
      pkkAmount: true,
      payIpl: true,
      iplAmount: true,
    },
  });

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

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
    </div>
  );
}
