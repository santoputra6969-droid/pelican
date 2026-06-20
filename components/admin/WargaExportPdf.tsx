"use client";

import { useCallback } from "react";
import { Icon } from "@/components/Icon";
import { formatDate } from "@/lib/format";

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
  phone: string | null;
  note: string | null;
};

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
    const marginY = 12;

    // Header
    let cursorY = marginY;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PEMERINTAHAN KABUPATEN TANGERANG", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 4;
    doc.text("KECAMATAN PASAR KEMIS - DESA SUKAMANTRI", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 4;
    doc.text("RUKUN TETANGGA 09 RUKUN WARGA 11", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("CLUSTER PURI PELICAN", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 8;

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Sekretariat: Cluster Puri Pelican, Ds. Sukamantri, Pasar Kemis, Kab. Tangerang 15560", pageWidth / 2, cursorY, {
      align: "center",
    });
    cursorY += 3;
    doc.text("Email: clusterpericelican.purija@gmail.com", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 8;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Data Warga Cluster Puri Pelican", pageWidth / 2, cursorY, { align: "center" });
    cursorY += 6;

    // Filter Info
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Filter: Semua Data | Jumlah: " + houses.length + " rumah", marginX, cursorY);
    cursorY += 3;
    doc.text("Tanggal Cetak: " + new Date().toLocaleDateString("id-ID"), marginX, cursorY);
    cursorY += 8;

    // Summary section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("RINGKASAN DATA", marginX, cursorY);
    cursorY += 6;

    // Calculate statistics
    const totalRumah = houses.length;
    const kosong = houses.filter((h) => !h.occupied).length;
    const ditempatiPemilik = houses.filter((h) => h.occupied && h.occupiedByOwner).length;
    const ditempatiPengontrak = houses.filter((h) => h.occupied && !h.occupiedByOwner).length;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Status Hunian:", marginX, cursorY);
    cursorY += 3.5;
    doc.text(`• Total Rumah: ${totalRumah}`, marginX + 2, cursorY);
    cursorY += 3;
    doc.text(`• Kosong: ${kosong}`, marginX + 2, cursorY);
    cursorY += 3;
    doc.text(`• Ditempati Pemilik: ${ditempatiPemilik}`, marginX + 2, cursorY);
    cursorY += 3;
    doc.text(`• Ditempati Pengontrak: ${ditempatiPengontrak}`, marginX + 2, cursorY);
    cursorY += 8;

    // Statistics by Religion
    const religionStats = calculateReligionStats(residents);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Statistik Agama:", marginX, cursorY);
    cursorY += 3.5;
    Object.entries(religionStats).forEach(([religion, count]) => {
      doc.text(`• ${religion}: ${count} rumah`, marginX + 2, cursorY);
      cursorY += 3;
    });
    cursorY += 2;

    // Statistics by Family Size
    const familySizeStats = calculateFamilySizeStats(residents, members);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Statistik Jumlah Keluarga:", marginX, cursorY);
    cursorY += 3.5;
    Object.entries(familySizeStats).forEach(([size, count]) => {
      doc.text(`• ${size}: ${count} rumah`, marginX + 2, cursorY);
      cursorY += 3;
    });
    cursorY += 5;

    // Data table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DATA WARGA DETAIL", marginX, cursorY);
    cursorY += 5;

    const tableData = houses.map((house, idx) => {
      const resident = residents.find((r) => r.houseId === house.id);
      const familyMembers = members.filter((m) => m.houseId === house.id);
      const status = !house.occupied ? "Kosong" : house.occupiedByOwner ? "Pemilik" : "Penyewa";
      const name = resident?.name || house.ownerName || "-";
      const phone = resident?.phone || "-";
      const religion = parseReligion(resident?.note ?? null) || "-";

      return [
        String(idx + 1),
        `${house.block}${house.no}`,
        status,
        name,
        phone,
        String(familyMembers.length + 1),
        religion,
      ];
    });

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["No", "Rumah", "Status", "Nama", "Handphone", "KK", "Agama"]],
      body: tableData,
      theme: "grid",
      headStyles: {
        fillColor: [200, 200, 200],
        textColor: [0, 0, 0],
        fontSize: 8,
        fontStyle: "bold",
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 8 },
        1: { halign: "center", cellWidth: 12 },
        2: { halign: "center", cellWidth: 12 },
        3: { cellWidth: 35 },
        4: { cellWidth: 30 },
        5: { halign: "center", cellWidth: 8 },
        6: { halign: "center", cellWidth: 18 },
      },
    });

    // Save
    doc.save(`Data-Warga-${new Date().toLocaleDateString("id-ID")}.pdf`);
  }, [houses, residents, members]);

  return (
    <button onClick={handleExport} className="btn-primary inline-flex items-center gap-2">
      <Icon name="receipt" size={18} />
      Export PDF
    </button>
  );
}

function parseReligion(note: string | null): string {
  if (!note) return "";
  const match = note.match(/AGAMA:([A-Z]+)/);
  return match?.[1] ?? "";
}

function calculateReligionStats(
  residents: Resident[]
): Record<string, number> {
  const stats: Record<string, number> = {
    Islam: 0,
    Kristen: 0,
    Katholik: 0,
    Buddha: 0,
    Hindu: 0,
    Khonghucu: 0,
    "Tidak disi": 0,
  };

  residents.forEach((r) => {
    const religion = parseReligion(r.note) || "Tidak disi";
    if (religion in stats) {
      stats[religion]++;
    }
  });

  return stats;
}

function calculateFamilySizeStats(
  residents: Resident[],
  members: FamilyMember[]
): Record<string, number> {
  const stats: Record<string, number> = {
    "K0 (Kawins)": 0,
    "K1 (Kawin Anak 1)": 0,
    "K2 (Kawin Anak 2)": 0,
    "K3 (Kawin Anak 3)": 0,
    "K4 (Kawin Anak 4)": 0,
    "K5 (Kawin Anak 5)": 0,
    "TK (Tidak Kawin)": 0,
  };

  const houseToMembers = new Map<number, number>();
  members.forEach((m) => {
    houseToMembers.set(m.houseId, (houseToMembers.get(m.houseId) ?? 0) + 1);
  });

  residents.forEach((r) => {
    const familyStatus = r.familyStatus || "";
    const memberCount = houseToMembers.get(r.houseId) ?? 0;

    if (familyStatus.startsWith("KAWIN_ANAK_")) {
      const num = familyStatus.split("_").pop();
      stats[`K${num} (Kawin Anak ${num})`] = (stats[`K${num} (Kawin Anak ${num})`] ?? 0) + 1;
    } else if (familyStatus === "KAWIN") {
      stats["K0 (Kawins)"]++;
    } else {
      stats["TK (Tidak Kawin)"]++;
    }
  });

  return Object.fromEntries(Object.entries(stats).filter(([, count]) => count > 0));
}
