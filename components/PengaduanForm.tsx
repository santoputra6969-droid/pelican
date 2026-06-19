"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createComplaint, type ComplaintResult } from "@/app/actions";
import { Icon } from "./Icon";

const CATEGORIES = [
  { id: "KEAMANAN", label: "Keamanan" },
  { id: "KEBERSIHAN", label: "Kebersihan" },
  { id: "FASILITAS", label: "Fasilitas" },
  { id: "LINGKUNGAN", label: "Lingkungan" },
  { id: "UMUM", label: "Umum" },
];

export function PengaduanForm() {
  const [state, formAction] = useActionState<ComplaintResult, FormData>(
    createComplaint,
    null
  );
  const [category, setCategory] = useState("UMUM");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      setCategory("UMUM");
    }
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="card space-y-4 p-5"
    >
      <input type="hidden" name="category" value={category} />

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Kategori
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-pelican-600 text-white"
                    : "bg-black/[0.04] text-ink-soft"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Keluhan / Pengaduan
        </label>
        <textarea
          name="message"
          rows={5}
          required
          maxLength={2000}
          placeholder="Ceritakan keluhan atau masukan Anda untuk pengurus..."
          className="input resize-none"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
          Upload Gambar Bukti (opsional)
        </label>
        <input name="imageFile" type="file" accept="image/*" className="input-file" />
      </div>

      {state && !state.ok && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
          {state.message}
        </p>
      )}
      {state?.ok && (
        <p className="flex items-center gap-1.5 rounded-xl bg-pelican-50 px-3 py-2 text-xs font-semibold text-pelican-700">
          <Icon name="check" size={14} />
          Pengaduan terkirim. Terima kasih, akan kami tindak lanjuti.
        </p>
      )}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary w-full disabled:opacity-60"
    >
      <Icon name="send" size={18} />
      {pending ? "Mengirim..." : "Kirim Pengaduan"}
    </button>
  );
}
