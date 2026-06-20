"use client";

type MemberRow = {
  relation: "ANAK" | "KERABAT" | "SUAMI" | "ISTRI";
  name: string | null;
};

const RELATIONS: Record<string, string> = {
  PEMILIK: "Pemilik Rumah",
  PENGHUNI: "Pengontrak",
};

const FAMILY_STATUSES: Record<string, string> = {
  BELUM_KAWIN: "Belum Kawin",
  KAWIN: "Kawin",
  KAWIN_ANAK_1: "Kawin Anak 1",
  KAWIN_ANAK_2: "Kawin Anak 2",
  KAWIN_ANAK_3: "Kawin Anak 3",
  KAWIN_ANAK_4: "Kawin Anak 4",
  KAWIN_ANAK_5: "Kawin Anak 5",
  BERCERAI: "Bercerai",
  BERCERAI_ANAK_1: "Bercerai Anak 1",
  BERCERAI_ANAK_2: "Bercerai Anak 2",
  BERCERAI_ANAK_3: "Bercerai Anak 3",
  BERCERAI_ANAK_4: "Bercerai Anak 4",
  BERCERAI_ANAK_5: "Bercerai Anak 5",
};

const RELATIONS_ANGGOTA: Record<string, string> = {
  ANAK: "Anak",
  KERABAT: "Kerabat",
  SUAMI: "Suami",
  ISTRI: "Istri",
};

export function ResidentReadOnly({
  block,
  no,
  name,
  phone,
  relation,
  familyStatus,
  religion,
  members,
  hasData,
}: {
  block: string;
  no: string;
  name: string;
  phone: string;
  relation: string;
  familyStatus: string;
  religion: string;
  members: MemberRow[];
  hasData: boolean;
}) {
  return (
    <div className="card space-y-5 p-5">
      {/* Info Box */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
        <p className="mb-1 font-semibold">📋 Informasi Data Warga</p>
        Data ini hanya dapat dilihat. Jika ada data yang perlu diperbarui atau diperbaiki,
        silakan hubungi pengurus RT untuk melakukan pembaharuan.
      </div>

      {hasData && (
        <div className="space-y-4">
          {/* Blok & Nomor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Blok Rumah" value={block} />
            <Field label="No Rumah" value={no} />
          </div>

          {/* Hubungan & Nama */}
          <Field
            label="Hubungan Dengan Rumah"
            value={RELATIONS[relation] || relation || "-"}
          />
          <Field label="Nama Kepala Keluarga" value={name || "-"} />

          {/* Handphone & Status */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="No Handphone" value={phone || "-"} />
            <Field
              label="Status Perkawinan"
              value={FAMILY_STATUSES[familyStatus] || familyStatus || "-"}
            />
          </div>

          {/* Agama */}
          <Field label="Agama" value={religion || "-"} />

          {/* Anggota Rumah */}
          <div className="rounded-xl border border-black/10 p-3">
            <p className="mb-3 text-sm font-semibold text-ink">Anggota Rumah</p>
            {members.length === 0 ? (
              <p className="text-xs text-ink-faint">Belum ada anggota tambahan.</p>
            ) : (
              <div className="space-y-2">
                {members.map((m, idx) => (
                  <div key={`member-${idx}`} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pelican-50 text-xs font-semibold text-pelican-600">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-ink-soft">
                        {RELATIONS_ANGGOTA[m.relation] || "Anggota"}
                      </p>
                      <p className="text-sm font-medium text-ink">{m.name || "-"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 rounded-xl bg-black/[0.03] px-3 py-2.5 text-sm text-ink">{value}</p>
    </div>
  );
}
