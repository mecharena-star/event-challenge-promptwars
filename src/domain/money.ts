import type { Currency } from "./schema";

const LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
};

/** Formats whole currency units, for example 1500000 INR as "₹15,00,000". */
export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
