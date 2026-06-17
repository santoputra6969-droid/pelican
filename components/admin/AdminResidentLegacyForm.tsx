"use client";

import { useMemo, useState } from "react";
import { ActionForm } from "@/components/admin/ActionForm";
import { saveResident } from "@/app/admin/actions";

type HouseOption = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
};

const RELATIONS = [
  { value: "PEMILIK", label: "Pemilik Rumah" },
  { value: "PENGHUNI", label: "Pengontrak" },
];

const FAMILY_STATUSES = [
  { value: "BELUM_KAWIN", label: "Belum Kawin" },
  { value: "KAWIN", label: "Kawin" },
  { value: "KAWIN_ANAK_1", label: "Kawin Anak 1" },
  { value: "KAWIN_ANAK_2", label: "Kawin Anak 2" },
  { value: "KAWIN_ANAK_3", label: "Kawin Anak 3" },
  { value: "KAWIN_ANAK_4", label: "Kawin Anak 4" },
  { value: "KAWIN_ANAK_5", label: "Kawin Anak 5" },
  { value: "BERCERAI", label: "Bercerai" },
  { value: "BERCERAI_ANAK_1", label: "Bercerai Anak 1" },
  { value: "BERCERAI_ANAK_2", label: "Bercerai Anak 2" },
  { value: "BERCERAI_ANAK_3", label: "Bercerai Anak 3" },
  { value: "BERCERAI_ANAK_4", label: "Bercerai Anak 4" },
  { value: "BERCERAI_ANAK_5", label: "Bercerai Anak 5" },
];

const RELIGIONS = ["ISLAM", "KRISTEN", "KATHOLIK", "BUDDHA", "HINDU", "KHONGHUCU"];

export function AdminResidentLegacyForm({ houses }: { houses: HouseOption[] }) {
  const blocks = useMemo(
    () => [...new Set(houses.map((h) => h.block))].sort((a, b) => a.localeCompare(b)),
    [houses]
  );

  const [block, setBlock] = useState(blocks[0] ?? "");
  const [relation, setRelation] = useState("PEMILIK");
  const [religion, setReligion] = useState("ISLAM");

  const houseOptions = useMemo(
    () =>
      houses
        .filter((h) => h.block === block)
        .sort((a, b) => Number(a.no) - Number(b.no) || a.no.localeCompare(b.no)),
    [houses, block]
  );

  const [houseId, setHouseId] = useState<number>(houseOptions[0]?.id ?? 0);

  const selectedHouse = houseOptions.find((h) => h.id === houseId) ?? houseOptions[0] ?? null;

  return (
    <ActionForm action={saveResident} className="card space-y-4 p-5">
      <input type="hidden" name="houseId" value={selectedHouse?.id ?? 0} />
      <input type="hidden" name="role" value={relation} />
      <input type="hidden" name="note" value={`AGAMA:${religion};SUMBER:ADMIN_PENGKINIAN`} />
      <input type="hidden" name="active" value="on" />

      <div className="rounded-xl border border-[#1f97ef] bg-[#e8f4ff] px-3 py-2.5 text-sm leading-relaxed text-[#024b7d]">
        Kami sangat menghargai privasi anda, data yang anda submit tidak akan dapat diakses oleh publik,
        data anda hanya dapat diakses oleh pengurus RT sebagai bentuk pendataan administratif digital.
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Blok Rumah *</label>
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
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">No Rumah *</label>
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

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Hubungan Dengan Rumah *</label>
        <select
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="input"
        >
          {RELATIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Nama Kepala Keluarga *</label>
        <input
          key={selectedHouse?.id ?? 0}
          name="name"
          required
          defaultValue={selectedHouse?.ownerName ?? ""}
          placeholder="Nama Kepala Keluarga"
          className="input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">No Handphone *</label>
        <input name="phone" required inputMode="tel" placeholder="08xxxxxxxxxx" className="input" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Status *</label>
        <select name="familyStatus" required defaultValue="" className="input">
          <option value="" disabled>
            Pilih status
          </option>
          {FAMILY_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Agama *</label>
        <select value={religion} onChange={(e) => setReligion(e.target.value)} className="input">
          {RELIGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Kartu Keluarga (Gambar atau PDF) *
        </label>
        <input
          name="kkFile"
          type="file"
          required
          accept="image/*,application/pdf"
          className="input-file"
        />
      </div>

      <button type="submit" className="btn-primary w-full uppercase">
        Submit
      </button>
    </ActionForm>
  );
}
