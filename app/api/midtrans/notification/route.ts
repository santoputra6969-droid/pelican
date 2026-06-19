import { NextResponse } from "next/server";
import { verifyNotificationSignature } from "@/lib/midtrans";
import { markPaymentStatus } from "@/lib/payments";

export const dynamic = "force-dynamic";

type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_id?: string;
};

export async function POST(req: Request) {
  let body: MidtransNotification;
  try {
    body = (await req.json()) as MidtransNotification;
  } catch {
    return NextResponse.json({ message: "invalid json" }, { status: 400 });
  }

  const {
    order_id,
    status_code,
    gross_amount,
    signature_key,
    transaction_status,
    fraud_status,
  } = body;

  if (!order_id || !status_code || !gross_amount || !signature_key) {
    return NextResponse.json({ message: "missing fields" }, { status: 400 });
  }

  // Verifikasi keaslian notifikasi
  const valid = verifyNotificationSignature({
    order_id,
    status_code,
    gross_amount,
    signature_key,
  });
  if (!valid) {
    return NextResponse.json({ message: "invalid signature" }, { status: 403 });
  }

  const status = transaction_status ?? "";

  try {
    if (
      status === "settlement" ||
      (status === "capture" && fraud_status === "accept")
    ) {
      await markPaymentStatus(order_id, "REVIEW", {
        paymentType: body.payment_type ?? null,
        settlementTransactionId: body.transaction_id ?? null,
      });
    } else if (status === "expire") {
      await markPaymentStatus(order_id, "EXPIRED");
    } else if (status === "cancel") {
      await markPaymentStatus(order_id, "CANCEL");
    } else if (status === "deny") {
      await markPaymentStatus(order_id, "FAILED");
    }
    // status "pending" / "capture-challenge" dibiarkan PENDING
  } catch (err) {
    console.error("[midtrans] gagal proses notifikasi", err);
    return NextResponse.json({ message: "internal error" }, { status: 500 });
  }

  return NextResponse.json({ message: "ok" });
}
