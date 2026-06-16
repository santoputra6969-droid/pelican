import crypto from "crypto";

/**
 * Helper Midtrans Snap.
 * Mode produksi/sandbox dikontrol via env MIDTRANS_IS_PRODUCTION.
 * Tidak memakai SDK eksternal — cukup fetch ke REST API Snap.
 */

export function isMidtransProduction(): boolean {
  return String(process.env.MIDTRANS_IS_PRODUCTION ?? "").toLowerCase() === "true";
}

export function getServerKey(): string {
  const key = process.env.MIDTRANS_SERVER_KEY;
  if (!key) throw new Error("MIDTRANS_SERVER_KEY belum diset di environment.");
  return key;
}

export function getClientKey(): string {
  // Client key boleh kosong di server; dipakai di frontend lewat NEXT_PUBLIC_*.
  return process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
}

function snapBaseUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

export function snapJsUrl(): string {
  return isMidtransProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

type SnapItem = {
  id: string;
  price: number;
  quantity: number;
  name: string;
};

export type CreateSnapParams = {
  orderId: string;
  grossAmount: number;
  items: SnapItem[];
  customer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  finishRedirectUrl?: string;
  notificationUrl?: string;
};

export type SnapTransaction = {
  token: string;
  redirect_url: string;
};

export async function createSnapTransaction(
  params: CreateSnapParams
): Promise<SnapTransaction> {
  const serverKey = getServerKey();
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const body: Record<string, unknown> = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.grossAmount,
    },
    item_details: params.items,
    credit_card: { secure: true },
  };
  if (params.customer) body.customer_details = params.customer;
  if (params.finishRedirectUrl) {
    body.callbacks = { finish: params.finishRedirectUrl };
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Authorization: `Basic ${auth}`,
  };
  // Override notification URL per transaksi (tanpa perlu set di dashboard).
  if (params.notificationUrl) {
    headers["X-Override-Notification"] = params.notificationUrl;
  }

  const res = await fetch(snapBaseUrl(), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as
    | SnapTransaction
    | { error_messages?: string[] };

  if (!res.ok || !("token" in data)) {
    const msg =
      "error_messages" in data && data.error_messages
        ? data.error_messages.join(", ")
        : `Gagal membuat transaksi Midtrans (HTTP ${res.status}).`;
    throw new Error(msg);
  }

  return data;
}

/**
 * Verifikasi signature_key dari notifikasi Midtrans:
 * sha512(order_id + status_code + gross_amount + server_key)
 */
export function verifyNotificationSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = getServerKey();
  const expected = crypto
    .createHash("sha512")
    .update(
      `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`
    )
    .digest("hex");
  return expected === payload.signature_key;
}
