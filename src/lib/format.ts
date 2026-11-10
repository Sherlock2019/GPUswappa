export const TIME_ZONE = "Asia/Ho_Chi_Minh";

export function toNum(v: bigint | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  return typeof v === "bigint" ? Number(v) : v;
}

export function formatVnd(v: bigint | number | null | undefined, locale = "vi"): string {
  const n = toNum(v);
  if (n === null) return "—";
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);
}

export function formatUsd(n: number, locale = "vi") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "vi-VN", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function formatDate(d: Date | string | null | undefined, locale = "vi"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", { timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

export function formatDateTime(d: Date | string | null | undefined, locale = "vi"): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "vi-VN", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

/** Masks serial numbers for any non-private display: "SN-1234567890" → "••••7890". */
export function maskSerial(s: string) {
  const t = s.trim();
  return t.length <= 4 ? "••••" : `••••${t.slice(-4)}`;
}

/** Parses a VND amount typed by a user ("1.200.000.000", "1,200,000,000", "1200000000"). */
export function parseVnd(input: string | null | undefined): bigint | null {
  if (!input) return null;
  const digits = input.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (digits.length > 15) return null;
  return BigInt(digits);
}
