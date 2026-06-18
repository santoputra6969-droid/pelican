import Script from "next/script";
import { redirect } from "next/navigation";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import { BayarCommunityFee } from "@/components/BayarCommunityFee";
import { getSelectedHouse } from "@/lib/session";
import { getCommunityFeeStatusForHouse } from "@/lib/communityFees";
import { getClientKey, snapJsUrl } from "@/lib/midtrans";

export const dynamic = "force-dynamic";

export default async function BayarKasPage() {
  const house = await getSelectedHouse();
  if (!house) redirect("/pilih-rumah");

  const status = await getCommunityFeeStatusForHouse({
    feeType: "KAS",
    houseId: house.id,
    includeAllYears: true,
  });
  const ownerLabel = house.ownerName ?? `Blok ${house.block} / No. ${house.no}`;

  return (
    <main className="flex min-h-screen flex-col">
      <PageHeader title="Bayar Kas" subtitle={`Blok ${house.block} / No. ${house.no}`} />
      <BayarCommunityFee
        feeType="KAS"
        dueBills={status.dueBills}
        paidBills={status.paidBills}
        ownerLabel={ownerLabel}
      />
      <Script src={snapJsUrl()} data-client-key={getClientKey()} strategy="afterInteractive" />
      <div className="h-6" />
      <BottomNav />
    </main>
  );
}