"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "./Modal";
import { Icon } from "@/components/Icon";
import { deleteHouse, saveHouse } from "@/app/admin/actions";
import { ActionForm } from "./ActionForm";
import { WargaExportPdf } from "./WargaExportPdf";
import { formatRupiah } from "@/lib/format";

type House = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
  occupied: boolean;
  occupiedByOwner: boolean;
  payIpl: boolean;
  iplAmount: number;
  unpaid: number;
};

type Resident = {
  houseId: number;
  name: string | null;
  phone: string | null;
  role: string | null;
  familyStatus: string | null;
  note: string | null;
};

type FamilyMember = {
  houseId: number;
  name: string | null;
  phone: string | null;
  note: string | null;
};

export function WargaManager({
  houses,
  residents,
  members,
}: {
  houses: House[];
  residents?: Resident[];
  members?: FamilyMember[];
}) {
  const [editing, setEditing] = useState<House | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | "OWNER" | "RENTER" | "EMPTY">("ALL");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return houses.filter((h) => {
      const matchQuery =
        (h.ownerName ?? "").toLowerCase().includes(q) ||
        `${h.block}${h.no}`.toLowerCase().includes(q) ||
        `${h.block} ${h.no}`.toLowerCase().includes(q);

      if (!matchQuery) return false;
      if (status === "ALL") return true;
      if (status === "OWNER") return h.occupied && h.occupiedByOwner;
      if (status === "RENTER") return h.occupied && !h.occupiedByOwner;
      return !h.occupied;
    });
  }, [houses, query, status]);

  function statusLabel(h: House) {
    if (!h.occupied) return "Kosong";
    return h.occupiedByOwner ? "Pemilik" : "Penyewa";
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full flex-1 sm:min-w-[200px]">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint">
            <Icon name="search" size={18} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, blok, nomor..."
            className="input pl-11"
          />
        </div>
        <div className="w-full sm:min-w-[220px] sm:w-auto">
          <select
            value={status}
            onChange={(e) =>
              setStatus(
                (e.target.value as "ALL" | "OWNER" | "RENTER" | "EMPTY")
              )
            }
            className="input"
            aria-label="Filter status hunian"
          >
            <option value="ALL">Semua Data</option>
            <option value="OWNER">Ditempati Pemilik</option>
            <option value="RENTER">Ditempati Pengontrak</option>
            <option value="EMPTY">Kosong</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="btn-primary w-full sm:w-auto"
        >
          <Icon name="plus" size={18} />
          Tambah Rumah
        </button>
        <Link href="/admin/warga/pengkinian" className="btn-ghost w-full sm:w-auto">
          <Icon name="user-edit" size={17} />
          Pengkinian Data
        </Link>
        {residents && members && (
          <WargaExportPdf
            houses={houses}
            residents={residents}
            members={members}
          />
        )}
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/5 bg-black/[0.02] text-xs font-semibold text-ink-faint">
            <tr>
              <th className="px-5 py-3">Pemilik</th>
              <th className="px-5 py-3">Rumah</th>
              <th className="px-5 py-3">IPL / bln</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Tagihan</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {filtered.map((h) => (
              <tr key={h.id} className="hover:bg-black/[0.015]">
                <td className="px-5 py-3">
                  <p className="font-semibold text-ink">
                    {h.ownerName ?? "—"}
                  </p>
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  Blok {h.block} / No. {h.no}
                </td>
                <td className="px-5 py-3 text-ink-soft">
                  {h.payIpl ? formatRupiah(h.iplAmount) : "—"}
                </td>
                <td className="px-5 py-3">
                  <span className="chip">{statusLabel(h)}</span>
                </td>
                <td className="px-5 py-3">
                  {h.unpaid > 0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600">
                      {h.unpaid} belum bayar
                    </span>
                  ) : (
                    <span className="rounded-full bg-pelican-50 px-2 py-0.5 text-[11px] font-bold text-pelican-700">
                      Lunas
                    </span>
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link
                      href={`/admin/warga/${h.id}`}
                      className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-pelican-700 transition hover:bg-pelican-50"
                      aria-label="Data warga"
                    >
                      <Icon name="user" size={15} />
                      Data
                    </Link>
                    <button
                      onClick={() => {
                        setEditing(h);
                        setOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft transition hover:bg-black/5"
                      aria-label="Edit"
                    >
                      <Icon name="user-edit" size={16} />
                    </button>
                    <ActionForm action={deleteHouse}>
                      <input type="hidden" name="id" value={h.id} />
                      <button
                        type="submit"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 transition hover:bg-red-50"
                        aria-label="Hapus"
                      >
                        <Icon name="plus" size={16} className="rotate-45" />
                      </button>
                    </ActionForm>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-sm text-ink-faint">
            Data tidak ditemukan.
          </p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((h) => (
          <div key={h.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-ink">{h.ownerName ?? "—"}</p>
                <p className="text-[11px] text-ink-faint">
                  Blok {h.block} / No. {h.no}
                </p>
              </div>
              <span className="chip">{statusLabel(h)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-ink-soft">
                {h.payIpl ? formatRupiah(h.iplAmount) : "Tidak bayar IPL"}
              </span>
              <div className="flex gap-1.5">
                <Link
                  href={`/admin/warga/${h.id}`}
                  className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-pelican-700 hover:bg-pelican-50"
                >
                  <Icon name="user" size={15} />
                  Data
                </Link>
                <button
                  onClick={() => {
                    setEditing(h);
                    setOpen(true);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-black/5"
                >
                  <Icon name="user-edit" size={16} />
                </button>
                <ActionForm action={deleteHouse}>
                  <input type="hidden" name="id" value={h.id} />
                  <button
                    type="submit"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:bg-red-50"
                  >
                    <Icon name="plus" size={16} className="rotate-45" />
                  </button>
                </ActionForm>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit Data Rumah" : "Tambah Data Rumah"}
      >
        <ActionForm
          action={saveHouse}
          onSuccess={() => setOpen(false)}
          className="space-y-4"
        >
          <input type="hidden" name="id" value={editing?.id ?? ""} />
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Nama Pemilik
            </label>
            <input
              name="ownerName"
              defaultValue={editing?.ownerName ?? ""}
              placeholder="Opsional"
              className="input"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Blok
              </label>
              <input
                name="block"
                required
                defaultValue={editing?.block ?? ""}
                placeholder="mis. PLC-1"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
                Nomor
              </label>
              <input
                name="no"
                required
                defaultValue={editing?.no ?? ""}
                className="input"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink-soft">
              Iuran IPL / bulan (Rp)
            </label>
            <input
              name="iplAmount"
              type="number"
              min={0}
              defaultValue={editing?.iplAmount ?? 252000}
              className="input"
            />
          </div>
          <div className="space-y-2">
            <input type="hidden" name="payIpl" value="on" />
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked readOnly disabled className="h-4 w-4 accent-pelican-600" />
              Wajib bayar IPL
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="occupied"
                defaultChecked={editing?.occupied ?? true}
                className="h-4 w-4 accent-pelican-600"
              />
              Dihuni
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="occupiedByOwner"
                defaultChecked={editing?.occupiedByOwner ?? true}
                className="h-4 w-4 accent-pelican-600"
              />
              Dihuni oleh pemilik
            </label>
          </div>
          <button type="submit" className="btn-primary w-full">
            Simpan
          </button>
        </ActionForm>
      </Modal>
    </div>
  );
}
