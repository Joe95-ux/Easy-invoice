const COMPANY_FIELD_LABELS: Record<string, string> = {
  name: "company name",
  email: "email",
  phone: "phone",
  address: "address",
  city: "city",
  state: "state",
  zip: "ZIP",
  country: "country",
  currency: "currency",
  locale: "locale",
  taxId: "tax ID",
  logoBg: "logo background",
  logoPlacement: "logo placement",
  brandColor: "brand color",
  defaultHourlyRate: "default hourly rate",
  documentPrefix: "invoice prefix",
};

const REMINDER_FIELD_LABELS: Record<string, string> = {
  remindersEnabled: "automatic reminders",
  reminderDaysBefore: "days before due",
  reminderOnDueDate: "remind on due date",
  reminderDaysAfter: "days after due",
  reminderIncludePdf: "attach PDF to reminders",
  paymentReceiptEmailsEnabled: "payment receipt emails",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "empty";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "on" : "off";
  if (typeof value === "object" && value !== null && "toString" in value) {
    return String(value);
  }
  return String(value);
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  }
  const normalizedA = a === "" || a === undefined ? null : a;
  const normalizedB = b === "" || b === undefined ? null : b;
  return normalizedA === normalizedB;
}

function buildFieldChangeSummary(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  labels: Record<string, string>,
): { summary: string; changes: Array<{ field: string; from: string; to: string }> } {
  const changes: Array<{ field: string; from: string; to: string }> = [];

  for (const key of Object.keys(labels)) {
    const from = before[key];
    const to = after[key];
    if (valuesEqual(from, to)) continue;
    changes.push({
      field: key,
      from: formatValue(from),
      to: formatValue(to),
    });
  }

  if (changes.length === 0) {
    return { summary: "No settings changed", changes };
  }

  const parts = changes.map((change) => {
    const label = labels[change.field] ?? change.field;
    return `${label}: ${change.from} → ${change.to}`;
  });

  return {
    summary: parts.join("; "),
    changes,
  };
}

export function summarizeCompanyProfileChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return buildFieldChangeSummary(before, after, COMPANY_FIELD_LABELS);
}

export function summarizeReminderSettingsChange(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  return buildFieldChangeSummary(before, after, REMINDER_FIELD_LABELS);
}
