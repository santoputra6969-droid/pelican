"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createLetterRequest, type LetterResult } from "@/app/actions";
import { Icon } from "./Icon";

const TYPES = [
  { id: "PENGANTAR", label: "Pengantar" },
  { id: "DOMISILI", label: "Domisili" },
  { id: "KETERANGAN", label: "Keterangan" },
  { id: "LAINNYA", label: "Lainnya" },
];

export function SuratForm({ defaultName }: { defaultName?: string }) {
  const [state, formAction] = useActionState<LetterResult, FormData>(
    createLetterRequest,
    null
  );
  const [type, setType] = useState("PENGANTAR");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setType("PENGANTAR");
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="card space-y-4 p-5">
      <input type="hidden" name="type" value={type} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Jenis Surat
        </label>
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => {
            const active = type === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-pelican-600 text-white" : "bg-black/[0.04] text-ink-soft"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Nama Pemohon
        </label>
        <input
          name="applicant"
          required
          defaultValue={defaultName ?? ""}
          className="input"
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          No. Handphone
        </label>
        <input name="phone" className="input" placeholder="08xxx (opsional)" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Keperluan
        </label>
        <textarea
          name="purpose"
          rows={4}
          required
          maxLength={2000}
          placeholder="Jelaskan keperluan surat Anda..."
          className="input resize-none"
        />
      </div>

      {state && !state.ok && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-xl bg-pelican-50 px-3 py-2 text-xs font-semibold text-pelican-700">
          <Icon name="check" size={14} />
          Pengajuan terkirim. Akan diproses pengelola.
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
      {pending ? "Mengirim..." : "Ajukan Surat"}
    </button>
  );
}
