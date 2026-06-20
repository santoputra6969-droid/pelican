"use client";

import { useMemo, useState, useEffect } from "react";
import { Icon } from "@/components/Icon";

type HouseOption = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
};

type ResidentData = {
  name: string | null;
  phone: string | null;
  role: string | null;
  familyStatus: string | null;
  note: string | null;
  members: Array<{
    name: string | null;
    note: string | null;
  }>;
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

function parseRelation(note: string | null): string {
  if (!note) return "ANAK";
  const match = note.match(/RELASI:([A-Z_]+)/);
  if (match?.[1] === "KERABAT") return "KERABAT";
  if (match?.[1] === "SUAMI") return "SUAMI";
  if (match?.[1] === "ISTRI") return "ISTRI";
  return "ANAK";
}

function parseReligion(note: string | null): string {
  if (!note) return "";
  const match = note.match(/AGAMA:([A-Z]+)/);
  return match?.[1] ?? "";
}

export function AdminWargaReadOnlyDisplay({
  houses,
  initialHouseId,
  residentDataMap,
}: {
  houses: HouseOption[];
  initialHouseId?: number | null;
  residentDataMap?: Record<number, ResidentData>;
}) {
  const blocks = useMemo(
    () => [...new Set(houses.map((h) => h.block))].sort((a, b) => a.localeCompare(b)),
    [houses]
  );

  const [block, setBlock] = useState(
    initialHouseId ? houses.find((h) => h.id === initialHouseId)?.block : blocks[0] ?? ""
  );
  const [houseId, setHouseId] = useState(initialHouseId ?? 0);

  const houseOptions = useMemo(
    () =>
      houses
        .filter((h) => h.block === block)
        .sort((a, b) => Number(a.no) - Number(b.no) || a.no.localeCompare(b.no)),
    [houses, block]
  );

  const selectedHouse = houseOptions.find((h) => h.id === houseId) ?? houseOptions[0] ?? null;
  const data = residentDataMap ? residentDataMap[selectedHouse?.id ?? 0] : null;

  return (
    <div className="space-y-5">
      {/* House Selector */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Blok Rumah</label>
          <select
            value={block}
            onChange={(e) => {
              const nextBlock = e.target.value;
              setBlock(nextBlock);
              const first = houses
                .filter((h) => h.block === nextBlock)
                .sort((a, b) => Number(a.no) - Number(b.no) || a.no.localeCompare(b.no))[0];
              setHouseId(first?.id ?? 0);
            }}
            className="input"
          >
            {blocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-ink-soft">No Rumah</label>
          <select
            value={selectedHouse?.id ?? 0}
            onChange={(e) => setHouseId(Number(e.target.value))}
            className="input"
          >
            {houseOptions.length ? (
              houseOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.no}
                </option>
              ))
            ) : (
              <option value={0}>Mohon Pilih Block Dahulu</option>
            )}
          </select>
        </div>
      </div>

      {/* Data Display */}
      {selectedHouse && (
        <div className="card space-y-5 p-5">
          {data ? (
            <>
              {/* Info Box */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
                <p className="font-semibold mb-1">📋 Informasi Data Warga</p>
                Jika ada data yang perlu diperbarui, silakan hubungi pengurus RT untuk melakukan
                pembaharuan. Data Anda dilindungi dan hanya dapat diakses oleh pengurus RT.
              </div>

              <div className="space-y-4">
                {/* Blok & Nomor */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Blok</p>
                    <p className="mt-1 text-sm text-ink">{selectedHouse.block}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Nomor Rumah</p>
                    <p className="mt-1 text-sm text-ink">{selectedHouse.no}</p>
                  </div>
                </div>

                {/* Hubungan & Nama */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Hubungan Dengan Rumah</p>
                    <p className="mt-1 text-sm text-ink">
                      {RELATIONS[data.role ?? ""] || data.role || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Nama Kepala Keluarga</p>
                    <p className="mt-1 text-sm text-ink">{data.name || "-"}</p>
                  </div>
                </div>

                {/* Handphone & Status */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">No Handphone</p>
                    <p className="mt-1 text-sm text-ink">{data.phone || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-soft">Status Perkawinan</p>
                    <p className="mt-1 text-sm text-ink">
                      {FAMILY_STATUSES[data.familyStatus ?? ""] || data.familyStatus || "-"}
                    </p>
                  </div>
                </div>

                {/* Agama */}
                <div>
                  <p className="text-xs font-semibold text-ink-soft">Agama</p>
                  <p className="mt-1 text-sm text-ink">{parseReligion(data.note) || "-"}</p>
                </div>

                {/* Anggota Rumah */}
                {data.members && data.members.length > 0 && (
                  <div className="rounded-xl border border-black/10 p-3">
                    <p className="mb-3 text-sm font-semibold text-ink">Anggota Rumah</p>
                    <div className="space-y-2">
                      {data.members.map((member, idx) => (
                        <div key={`member-${idx}`} className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pelican-50 text-xs font-semibold text-pelican-600">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-ink-soft">
                              {RELATIONS_ANGGOTA[parseRelation(member.note)] || "Anggota"}
                            </p>
                            <p className="text-sm font-medium text-ink">{member.name || "-"}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
              <Icon name="search" size={24} className="mx-auto mb-2 text-amber-600" />
              <p className="text-sm font-semibold text-amber-900">Data Belum Terdaftar</p>
              <p className="mt-0.5 text-xs text-amber-800">
                Rumah {selectedHouse.block} No. {selectedHouse.no} belum memiliki data warga.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
