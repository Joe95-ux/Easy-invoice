export type CompanyPaymentMethod = {
  label: string;
  value: string;
};

export type BankDetailFields = {
  bankName: string;
  accountName: string;
  routingNumber: string;
  accountNumber: string;
};

export const BANK_DETAIL_FIELDS = [
  { key: "bankName", label: "Bank name", placeholder: "Chase" },
  { key: "accountName", label: "Account name", placeholder: "Your Company LLC" },
  { key: "routingNumber", label: "Routing number", placeholder: "021000021" },
  { key: "accountNumber", label: "Account number", placeholder: "••••4821" },
] as const satisfies ReadonlyArray<{
  key: keyof BankDetailFields;
  label: string;
  placeholder: string;
}>;

const EMPTY_BANK_DETAILS: BankDetailFields = {
  bankName: "",
  accountName: "",
  routingNumber: "",
  accountNumber: "",
};

const MAX_PAYMENT_METHODS = 12;
const MAX_LABEL_LENGTH = 40;
const MAX_VALUE_LENGTH = 500;

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

export function isBankTransferMethod(label: string) {
  const normalized = label.trim().toLowerCase();
  return normalized.includes("bank") || normalized.includes("wire");
}

export function parseBankDetails(value: string): BankDetailFields {
  const details = { ...EMPTY_BANK_DETAILS };
  if (!value.trim()) return details;

  for (const line of value.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    for (const field of BANK_DETAIL_FIELDS) {
      const prefix = `${field.label}:`;
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
        details[field.key] = trimmed.slice(prefix.length).trim();
        break;
      }
    }
  }

  // Older freeform bank text with no labeled lines — keep it in bank name.
  if (
    !details.bankName &&
    !details.accountName &&
    !details.routingNumber &&
    !details.accountNumber &&
    value.trim()
  ) {
    details.bankName = value.trim();
  }

  return details;
}

export function serializeBankDetails(details: BankDetailFields): string {
  return BANK_DETAIL_FIELDS.map((field) => {
    const fieldValue = details[field.key].trim();
    return fieldValue ? `${field.label}: ${fieldValue}` : null;
  })
    .filter(Boolean)
    .join("\n");
}

export const SUGGESTED_PAYMENT_METHODS = [
  { label: "PayPal", value: "" },
  { label: "Zelle", value: "" },
  { label: "Venmo", value: "" },
  { label: "Cash App", value: "" },
  { label: "Bank transfer", value: "" },
  { label: "Wire transfer", value: "" },
] as const;

/** @deprecated Prefer SUGGESTED_PAYMENT_METHODS */
export const SUGGESTED_PAYMENT_LABELS = SUGGESTED_PAYMENT_METHODS.map(
  (method) => method.label,
);
