"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { ActionForm } from "./ActionForm";
import { deleteResident, saveResident } from "@/app/admin/actions";

type Resident = {
  id: number;
  role: string;
  name: string;
  phone: string | null;
  nik: string | null;
  familyStatus: string | null;
  active: boolean;
  note: string | null;
  ktpFileId: string | null;
  kkFileId: string | null;
};

export function ResidentManager({
  houseId,
  residents,
}: {
  houseId: number;
  residents: Resident[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resident | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(r: Resident) {
    setEditing(r);
    setOpen(true);
  }

  const owners = residents.filter((r) => r.role !== "PENGHUNI");
  const tenants = residents.filter((r) => r.role === "PENGHUNI");

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-bold text-ink">Data Pemilik & Penghuni</h2>
        <button onClick={openAdd} className="btn-primary w-full sm:w-auto">
          <Icon name="plus" size={18} />
          Tambah Data
        </button>
      </div>

      {residents.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          Belum ada data pemilik / penghuni untuk rumah ini.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            { label: "Data Pemilik", list: owners },
            { label: "Data Yang Menempati", list: tenants },
          ].map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {group.label}
              </p>
              {group.list.length === 0 ? (
                <div className="card p-5 text-sm text-ink-faint">Belum ada data.</div>
              ) : (
                <div className="space-y-3">
                  {group.list.map((r) => (
                    <ResidentCard
                      key={r.id}
                      resident={r}
                      onEdit={() => openEdit(r)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Data Warga" : "Tambah Data Warga"}
      >
        <ActionForm
          action={saveResident}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <input type="hidden" name="houseId" value={houseId} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Status
              </label>
              <select
                name="role"
                defaultValue={editing?.role ?? "PEMILIK"}
                className="input"
              >
                <option value="PEMILIK">Pemilik</option>
                <option value="PENGHUNI">Penghuni / Pengontrak</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Status Keluarga
              </label>
              <input
                name="familyStatus"
                defaultValue={editing?.familyStatus ?? ""}
                placeholder="mis. K0, K1"
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Nama Lengkap
            </label>
            <input
              name="name"
              required
              defaultValue={editing?.name ?? ""}
              className="input"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                No. Handphone
              </label>
              <input
                name="phone"
                defaultValue={editing?.phone ?? ""}
                placeholder="08xxx"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                NIK (KTP)
              </label>
              <input
                name="nik"
                defaultValue={editing?.nik ?? ""}
                inputMode="numeric"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Foto / Scan KTP
              </label>
              <input
                name="ktpFile"
                type="file"
                accept="image/*,application/pdf"
                className="input-file"
              />
              {editing?.ktpFileId && (
                <a
                  href={`/admin/files/${editing.ktpFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[11px] font-semibold text-pelican-700 underline"
                >
                  Lihat KTP saat ini
                </a>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Foto / Scan Kartu Keluarga
              </label>
              <input
                name="kkFile"
                type="file"
                accept="image/*,application/pdf"
                className="input-file"
              />
              {editing?.kkFileId && (
                <a
                  href={`/admin/files/${editing.kkFileId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[11px] font-semibold text-pelican-700 underline"
                >
                  Lihat KK saat ini
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Catatan
            </label>
            <textarea
              name="note"
              defaultValue={editing?.note ?? ""}
              rows={2}
              className="input"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="active"
              value="on"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4 accent-pelican-600"
            />
            Data aktif
          </label>
          {/* fallback agar active terkirim 'off' bila checkbox tidak dicentang */}
          <input type="hidden" name="active" value="off" />

          <p className="text-[11px] text-ink-faint">
            Dokumen KTP/KK disimpan aman & hanya bisa dibuka admin yang login.
            Maksimal 5 MB per file (JPG/PNG/PDF).
          </p>

          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}

function ResidentCard({
  resident: r,
  onEdit,
}: {
  resident: Resident;
  onEdit: () => void;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{r.name}</p>
          <p className="text-[11px] text-ink-faint">
            {r.familyStatus ? `Status Keluarga: ${r.familyStatus}` : "—"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
            r.active
              ? "bg-pelican-50 text-pelican-700"
              : "bg-black/5 text-ink-faint"
          }`}
        >
          {r.active ? "Aktif" : "Nonaktif"}
        </span>
      </div>

      <dl className="mt-3 space-y-1 text-xs text-ink-soft">
        <div className="flex justify-between gap-2">
          <dt className="text-ink-faint">Handphone</dt>
          <dd className="font-medium text-ink">{r.phone ?? "—"}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-ink-faint">NIK</dt>
          <dd className="font-medium text-ink">{r.nik ?? "—"}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {r.ktpFileId && (
          <a
            href={`/admin/files/${r.ktpFileId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-pelican-50 px-2.5 py-1 text-[11px] font-semibold text-pelican-700 hover:bg-pelican-100"
          >
            Lihat KTP
          </a>
        )}
        {r.kkFileId && (
          <a
            href={`/admin/files/${r.kkFileId}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-pelican-50 px-2.5 py-1 text-[11px] font-semibold text-pelican-700 hover:bg-pelican-100"
          >
            Lihat KK
          </a>
        )}
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-black/5"
            aria-label="Edit"
          >
            <Icon name="user-edit" size={16} />
          </button>
          <ActionForm action={deleteResident}>
            <input type="hidden" name="id" value={r.id} />
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50"
              aria-label="Hapus"
            >
              <Icon name="plus" size={16} className="rotate-45" />
            </button>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
