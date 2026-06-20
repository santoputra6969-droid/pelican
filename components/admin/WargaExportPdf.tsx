"use client";

import { useCallback } from "react";
import { Icon } from "@/components/Icon";

type House = {
  id: number;
  block: string;
  no: string;
  ownerName: string | null;
  occupied: boolean;
  occupiedByOwner: boolean;
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
  phone?: string | null;
  note: string | null;
};

const RELIGION_LABELS: Record<string, string> = {
  ISLAM: "Islam",
  KRISTEN: "Kristen",
  KATHOLIK: "Katholik",
  BUDDHA: "Buddha",
  HINDU: "Hindu",
  KHONGHUCU: "Khonghucu",
};

const FAMILY_LABELS: Record<string, string> = {
  K0: "Kawin",
  K1: "Kawin Anak 1",
  K2: "Kawin Anak 2",
  K3: "Kawin Anak 3",
  K4: "Kawin Anak 4",
  K5: "Kawin Anak 5",
  TK: "TK",
  TK0: "Bercerai",
  TK1: "Bercerai Anak 1",
  TK2: "Bercerai Anak 2",
  TK3: "Bercerai Anak 3",
  TK4: "Bercerai Anak 4",
  TK5: "Bercerai Anak 5",
};

function parseReligion(note: string | null): string {
  if (!note) return "";
  const match = note.match(/AGAMA:([A-Z]+)/);
  return match?.[1] ?? "";
}

function familyCode(status: string | null): string | null {
  if (!status) return null;
  if (status === "KAWIN") return "K0";
  if (status.startsWith("KAWIN_ANAK_")) return "K" + status.split("_").pop();
  if (status === "BELUM_KAWIN") return "TK";
  if (status === "BERCERAI") return "TK0";
  if (status.startsWith("BERCERAI_ANAK_")) return "TK" + status.split("_").pop();
  return null;
}

export function WargaExportPdf({
  houses,
  residents,
  members,
}: {
  houses: House[];
  residents: Resident[];
  members: FamilyMember[];
}) {
  const handleExport = useCallback(async () => {
    if (typeof window === "undefined") return;

    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 12;

    // Build resident lookup (first occurrence = latest by id desc from query)
    const residentByHouse = new Map<number, Resident>();
    residents.forEach((r) => {
      if (!residentByHouse.has(r.houseId)) residentByHouse.set(r.houseId, r);
    });

    // ---- Kop Surat ----
    const kopDataUrl = await loadKopDataUrl(window.location.origin);
    let cursorY = 12;
    if (kopDataUrl) {
      const imageType = kopDataUrl.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
      const kopWidth = pageWidth - marginX * 2;
      let kopHeight = kopWidth / 6.4;
      try {
        const props = doc.getImageProperties(kopDataUrl);
        if (props?.width && props?.height) {
          kopHeight = (props.height / props.width) * kopWidth;
        }
      } catch {
        // fallback to default ratio
      }
      doc.addImage(kopDataUrl, imageType, marginX, cursorY, kopWidth, kopHeight);
      cursorY += kopHeight + 6;
    } else {
      cursorY += 4;
    }

    // ---- Title ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(20, 20, 20);
    doc.text("Data Warga Cluster Puri Pelican", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Filter: Semua Data | Jumlah: ${houses.length} rumah`, pageWidth / 2, cursorY, {
      align: "center",
    });
    cursorY += 4.5;
    doc.text(`Tanggal Cetak: ${formatDateLong(new Date())}`, pageWidth / 2, cursorY, {
      align: "center",
    });
    cursorY += 10;

    // ---- RINGKASAN DATA ----
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("RINGKASAN DATA", marginX, cursorY);
    cursorY += 7;

    // Status Hunian
    const totalRumah = houses.length;
    const kosong = houses.filter((h) => !h.occupied).length;
    const ditempatiPemilik = houses.filter((h) => h.occupied && h.occupiedByOwner).length;
    const ditempatiPengontrak = houses.filter((h) => h.occupied && !h.occupiedByOwner).length;

    cursorY = drawStatSection(doc, marginX, cursorY, "Status Hunian:", [
      `Total Rumah: ${totalRumah}`,
      `Kosong: ${kosong}`,
      `Ditempati Pemilik: ${ditempatiPemilik}`,
      `Ditempati Pengontrak: ${ditempatiPengontrak}`,
    ]);

    // Statistik Agama
    const religionCount: Record<string, number> = {};
    let religionEmpty = 0;
    houses.forEach((h) => {
      const r = residentByHouse.get(h.id);
      const code = parseReligion(r?.note ?? null);
      if (code && RELIGION_LABELS[code]) {
        const label = RELIGION_LABELS[code];
        religionCount[label] = (religionCount[label] ?? 0) + 1;
      } else {
        religionEmpty++;
      }
    });
    const religionLines = Object.keys(religionCount)
      .sort((a, b) => a.localeCompare(b))
      .map((label) => `${label}: ${religionCount[label]} rumah`);
    if (religionEmpty > 0) religionLines.push(`Tidak diisi: ${religionEmpty} rumah`);

    cursorY = drawStatSection(doc, marginX, cursorY, "Statistik Agama:", religionLines);

    // Statistik Jumlah Keluarga
    const familyCount: Record<string, number> = {};
    let familyEmpty = 0;
    houses.forEach((h) => {
      const r = residentByHouse.get(h.id);
      const code = familyCode(r?.familyStatus ?? null);
      if (code) {
        familyCount[code] = (familyCount[code] ?? 0) + 1;
      } else {
        familyEmpty++;
      }
    });
    const familyOrder = [
      "K0", "K1", "K2", "K3", "K4", "K5",
      "TK", "TK0", "TK1", "TK2", "TK3", "TK4", "TK5",
    ];
    const familyLines = familyOrder
      .filter((code) => familyCount[code] > 0)
      .map((code) => `${code} (${FAMILY_LABELS[code]}): ${familyCount[code]} rumah`);
    if (familyEmpty > 0) familyLines.push(`Tidak diisi (Tidak diisi): ${familyEmpty} rumah`);

    cursorY = drawStatSection(doc, marginX, cursorY, "Statistik Jumlah Keluarga:", familyLines);

    // ---- Tabel Data Warga (mulai halaman baru) ----
    doc.addPage();

    const tableData = houses.map((house, idx) => {
      const resident = residentByHouse.get(house.id);
      const status = !house.occupied
        ? "Kosong"
        : house.occupiedByOwner
          ? "Pemilik"
          : "Pengontrak";
      const name = resident?.name || house.ownerName || "-";
      const phone = resident?.phone || "-";
      const kk = familyCode(resident?.familyStatus ?? null) ?? "-";
      const religion = parseReligion(resident?.note ?? null) || "-";

      return [
        String(idx + 1),
        `${house.block}-${house.no}`,
        status,
        name,
        phone,
        kk,
        religion,
      ];
    });

    autoTable(doc, {
      startY: marginX,
      margin: { left: marginX, right: marginX, top: marginX, bottom: 14 },
      head: [["No", "Rumah", "Status", "Nama", "Handphone", "KK", "Agama"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [247, 208, 56],
        textColor: [60, 50, 10],
        fontSize: 8,
        fontStyle: "bold",
        lineColor: [200, 200, 200],
        lineWidth: 0.1,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [40, 40, 40],
        lineColor: [220, 220, 220],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 46 },
        4: { cellWidth: 32 },
        5: { halign: "center", cellWidth: 14 },
        6: { cellWidth: 30 },
      },
    });

    // ---- Footer halaman (Halaman X of Y) ----
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Halaman ${i} of ${totalPages}`, marginX, pageHeight - 8);
    }

    doc.save(`Data-Warga-${new Date().toLocaleDateString("id-ID")}.pdf`);
  }, [houses, residents, members]);

  return (
    <button onClick={handleExport} className="btn-primary w-full sm:w-auto">
      <Icon name="receipt" size={18} />
      Export PDF
    </button>
  );
}

function drawStatSection(
  doc: import("jspdf").jsPDF,
  marginX: number,
  startY: number,
  title: string,
  lines: string[]
): number {
  let y = startY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(40, 40, 40);
  doc.text(title, marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  lines.forEach((line) => {
    doc.text(`•  ${line}`, marginX + 2, y);
    y += 4.5;
  });
  return y + 4;
}

function formatDateLong(value: Date): string {
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function loadImageAsDataUrl(imageUrl: string) {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error("Gagal memuat gambar kop");
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Gagal mengubah gambar ke data URL"));
    reader.readAsDataURL(blob);
  });
}

async function loadKopDataUrl(origin: string) {
  try {
    return await loadImageAsDataUrl(`${origin}/kop-surat.png`);
  } catch {
    try {
      return await loadImageAsDataUrl(`${origin}/kop-surat.jpg`);
    } catch {
      return null;
    }
  }
}
