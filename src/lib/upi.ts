const UPI_ID_PATTERN = /^[\w.-]{2,}@[a-zA-Z]{2,}$/;

export function isValidUpiId(value: string): boolean {
  return UPI_ID_PATTERN.test(value.trim());
}

/**
 * Standard UPI deep link. `amount`/`note`/`txnRef` are left out for the
 * admin's static "always on" QR (it's reused for every order and can't carry
 * a fixed amount) but included for the per-order "Pay using UPI app" button.
 */
export function buildUpiUri(input: {
  upiId: string;
  payeeName: string;
  currency?: string;
  amount?: number;
  note?: string;
  txnRef?: string;
}): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    cu: input.currency || "INR",
  });
  if (typeof input.amount === "number" && input.amount > 0) {
    params.set("am", input.amount.toFixed(2));
  }
  if (input.note) params.set("tn", input.note.slice(0, 50));
  if (input.txnRef) params.set("tr", input.txnRef);

  return `upi://pay?${params.toString()}`;
}
