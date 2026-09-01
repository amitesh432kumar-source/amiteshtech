import { paypalConfig } from "@/lib/env";

/**
 * Thin server-side PayPal REST client. Nothing here ever runs in the browser —
 * the secret must not leave the server, and capture results are the only thing
 * we trust when granting access.
 */

async function accessToken() {
  const config = paypalConfig();
  if (!config) throw new PayPalNotConfigured();

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await fetch(`${config.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal auth failed with status ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

export class PayPalNotConfigured extends Error {
  constructor() {
    super("PayPal is not configured");
    this.name = "PayPalNotConfigured";
  }
}

export function isPayPalConfigured() {
  return paypalConfig() !== null;
}

export type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: {
    reference_id?: string;
    amount?: { value: string; currency_code: string };
    payments?: { captures?: { id: string; status: string; amount: { value: string; currency_code: string } }[] };
  }[];
};

export async function createPayPalOrder(input: {
  amount: number;
  currency: string;
  referenceId: string;
  description: string;
}): Promise<PayPalOrder> {
  const config = paypalConfig();
  if (!config) throw new PayPalNotConfigured();

  const response = await fetch(`${config.apiBase}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          description: input.description.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: input.amount.toFixed(2),
          },
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`PayPal order creation failed with status ${response.status}`);
  }

  return (await response.json()) as PayPalOrder;
}

export async function capturePayPalOrder(paypalOrderId: string): Promise<PayPalOrder> {
  const config = paypalConfig();
  if (!config) throw new PayPalNotConfigured();

  const response = await fetch(
    `${config.apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  // A second capture of the same order returns 422; the order lookup below
  // then tells us whether it was already completed.
  if (response.status === 422) {
    return getPayPalOrder(paypalOrderId);
  }

  if (!response.ok) {
    throw new Error(`PayPal capture failed with status ${response.status}`);
  }

  return (await response.json()) as PayPalOrder;
}

export async function getPayPalOrder(paypalOrderId: string): Promise<PayPalOrder> {
  const config = paypalConfig();
  if (!config) throw new PayPalNotConfigured();

  const response = await fetch(
    `${config.apiBase}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
    {
      headers: { Authorization: `Bearer ${await accessToken()}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`PayPal order lookup failed with status ${response.status}`);
  }

  return (await response.json()) as PayPalOrder;
}

export function captureDetails(order: PayPalOrder) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.[0];
  return {
    transactionId: capture?.id ?? null,
    amount: capture?.amount?.value ?? unit?.amount?.value ?? null,
    currency: capture?.amount?.currency_code ?? unit?.amount?.currency_code ?? null,
    referenceId: unit?.reference_id ?? null,
  };
}
