export type CompanyPaymentMethod = {
  label: string;
  value: string;
};

const MAX_PAYMENT_METHODS = 12;
const MAX_LABEL_LENGTH = 40;
const MAX_VALUE_LENGTH = 200;

export function normalizePaymentMethods(raw: unknown): CompanyPaymentMethod[] {
  if (!Array.isArray(raw)) return [];

  const methods: CompanyPaymentMethod[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = typeof (item as { label?: unknown }).label === "string"
      ? (item as { label: string }).label.trim()
      : "";
    const value = typeof (item as { value?: unknown }).value === "string"
      ? (item as { value: string }).value.trim()
      : "";
    if (!label && !value) continue;
    methods.push({
      label: label.slice(0, MAX_LABEL_LENGTH),
      value: value.slice(0, MAX_VALUE_LENGTH),
    });
    if (methods.length >= MAX_PAYMENT_METHODS) break;
  }

  return methods.filter((method) => method.label.length > 0 && method.value.length > 0);
}

export const SUGGESTED_PAYMENT_LABELS = [
  "PayPal",
  "Zelle",
  "Venmo",
  "Cash App",
  "Bank transfer",
  "Wire transfer",
] as const;
