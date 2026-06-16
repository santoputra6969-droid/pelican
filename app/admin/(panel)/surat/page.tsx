import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { SuratManager } from "@/components/admin/SuratManager";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSuratPage() {
  const letters = await prisma.letterRequest.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <AdminPageHeader
        title="Kelola Surat"
        subtitle="Pengajuan surat dari warga (pengantar, domisili, dll)"
      />
      <SuratManager
        letters={letters.map((l) => ({
          id: l.id,
          houseLabel: l.houseLabel,
          applicant: l.applicant,
          phone: l.phone,
          type: l.type,
          purpose: l.purpose,
          status: l.status,
          note: l.note,
          resultFileId: l.resultFileId,
          createdAt: l.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
