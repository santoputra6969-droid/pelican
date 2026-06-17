"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitResidentForm, type ResidentFormResult } from "@/app/actions";
import { Icon } from "@/components/Icon";

type HouseOption = {
  block: string;
  no: string;
};

type MemberRow = {
  relation: "ANAK" | "KERABAT" | "SUAMI" | "ISTRI";
  name: string;
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

export function ResidentForm({
  houses,
  selectedBlock,
  selectedNo,
  defaultName,
  defaultPhone,
  defaultRelation,
  defaultFamilyStatus,
  defaultReligion,
  defaultMembers,
}: {
  houses: HouseOption[];
  selectedBlock: string;
  selectedNo: string;
  defaultName?: string;
  defaultPhone?: string;
  defaultRelation?: string;
  defaultFamilyStatus?: string;
  defaultReligion?: string;
  defaultMembers?: MemberRow[];
}) {
  const [state, formAction] = useActionState<ResidentFormResult, FormData>(
    submitResidentForm,
    null
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [block, setBlock] = useState(selectedBlock);
  const [no, setNo] = useState(selectedNo);
  const [members, setMembers] = useState<MemberRow[]>(defaultMembers ?? []);

  const blocks = useMemo(
    () => [...new Set(houses.map((h) => h.block))].sort((a, b) => a.localeCompare(b)),
    [houses]
  );

  const noOptions = useMemo(
    () =>
      houses
        .filter((h) => h.block === block)
        .map((h) => h.no)
        .sort((a, b) => Number(a) - Number(b) || a.localeCompare(b)),
    [houses, block]
  );

  useEffect(() => {
    if (!noOptions.includes(no)) {
      setNo(noOptions[0] ?? "");
    }
  }, [noOptions, no]);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setBlock(selectedBlock);
      setNo(selectedNo);
      setMembers(defaultMembers ?? []);
    }
  }, [state, selectedBlock, selectedNo, defaultMembers]);

  return (
    <form ref={formRef} action={formAction} className="card space-y-4 p-5">
      <input type="hidden" name="members" value={JSON.stringify(members)} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Blok Rumah *</label>
        <select
          name="block"
          required
          value={block}
          onChange={(e) => setBlock(e.target.value)}
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
        <select name="no" required value={no} onChange={(e) => setNo(e.target.value)} className="input">
          {noOptions.length ? (
            noOptions.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))
          ) : (
            <option value="">Mohon Pilih Block Dahulu</option>
          )}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Hubungan Dengan Rumah *</label>
        <select name="relation" required defaultValue={defaultRelation ?? "PEMILIK"} className="input">
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
          name="name"
          required
          defaultValue={defaultName ?? ""}
          placeholder="Nama Kepala Keluarga"
          className="input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">No Handphone *</label>
        <input
          name="phone"
          required
          defaultValue={defaultPhone ?? ""}
          inputMode="tel"
          placeholder="08xxxxxxxxxx"
          className="input"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">Status *</label>
        <select
          name="familyStatus"
          required
          defaultValue={defaultFamilyStatus ?? ""}
          className="input"
        >
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
        <select name="religion" required defaultValue={defaultReligion ?? ""} className="input">
          <option value="" disabled>
            Pilih agama
          </option>
          {RELIGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl border border-black/10 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">Anggota Rumah (Opsional)</p>
          <button
            type="button"
            onClick={() => setMembers((prev) => [...prev, { relation: "ANAK", name: "" }])}
            className="inline-flex items-center gap-1 rounded-lg bg-pelican-50 px-2.5 py-1 text-xs font-semibold text-pelican-700"
          >
            <Icon name="plus" size={14} /> Tambah
          </button>
        </div>

        {members.length === 0 ? (
          <p className="text-xs text-ink-faint">Belum ada anggota tambahan.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m, idx) => (
              <div key={`member-${idx}`} className="grid grid-cols-[120px_1fr_auto] gap-2">
                <select
                  value={m.relation}
                  onChange={(e) => {
                    const next = [...members];
                    const relation =
                      e.target.value === "KERABAT"
                        ? "KERABAT"
                        : e.target.value === "SUAMI"
                          ? "SUAMI"
                          : e.target.value === "ISTRI"
                            ? "ISTRI"
                            : "ANAK";
                    next[idx] = {
                      ...next[idx],
                      relation,
                    };
                    setMembers(next);
                  }}
                  className="input"
                >
                  <option value="ANAK">Anak</option>
                  <option value="KERABAT">Kerabat</option>
                  <option value="SUAMI">Suami</option>
                  <option value="ISTRI">Istri</option>
                </select>
                <input
                  value={m.name}
                  onChange={(e) => {
                    const next = [...members];
                    next[idx] = { ...next[idx], name: e.target.value };
                    setMembers(next);
                  }}
                  placeholder="Nama anggota"
                  className="input"
                />
                <button
                  type="button"
                  onClick={() => setMembers((prev) => prev.filter((_, i) => i !== idx))}
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
                  aria-label="Hapus anggota"
                >
                  <Icon name="plus" size={16} className="rotate-45" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {state && !state.ok && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-xl bg-pelican-50 px-3 py-2 text-xs font-semibold text-pelican-700">
          <Icon name="check" size={14} />
          {state.message}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
      <Icon name="send" size={18} />
      {pending ? "Menyimpan..." : "Submit"}
    </button>
  );
}
