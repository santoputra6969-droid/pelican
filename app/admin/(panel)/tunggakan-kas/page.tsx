import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { TunggakanReport } from "@/components/admin/TunggakanReport";
import { getCommunityFeeRows } from "@/lib/communityFees";

export const dynamic = "force-dynamic";

export default async function AdminTunggakanKasPage({
  searchParams,
}: {
  searchParams: Promise<{ block?: string }>;
}) {
  const sp = await searchParams;
  const selectedBlock = sp.block && sp.block !== "SEMUA" ? sp.block : "SEMUA";
  const selectedYear = new Date().getFullYear();

  const { rows, blocks, totalPiutang } = await getCommunityFeeRows({
    feeType: "KAS",
    selectedBlock,
    selectedYear,
  });

  return (
    <div className="px-5 py-6 lg:px-8">
      <div className="print:hidden">
        <AdminPageHeader
          title="Tunggakan Kas"
          subtitle={`Daftar rumah menunggak kas tahun ${selectedYear}`}
        />
      </div>
      <TunggakanReport
        rows={rows}
        blocks={blocks}
        selectedBlock={selectedBlock}
        totalPiutang={totalPiutang}
        reportKind="KAS"
        reportLabel="Tunggakan Kas"
        filterBasePath="/admin/tunggakan-kas"
      />
    </div>
  );
}
