import { randomBytes } from "crypto";

export function generatePublicToken(): string {
  return randomBytes(18).toString("base64url");
}

export function invoicePublicPath(token: string): string {
  return `/view/invoices/${token}`;
}

export function estimatePublicPath(token: string): string {
  return `/view/estimates/${token}`;
}

export function creditNotePublicPath(token: string): string {
  return `/view/credit-notes/${token}`;
}

export function statementPublicPath(token: string): string {
  return `/view/statements/${token}`;
}

export function publicDocumentUrl(
  origin: string,
  kind: "invoice" | "estimate" | "credit_note" | "statement",
  token: string,
): string {
  const path =
    kind === "invoice"
      ? invoicePublicPath(token)
      : kind === "estimate"
        ? estimatePublicPath(token)
        : kind === "statement"
          ? statementPublicPath(token)
          : creditNotePublicPath(token);
  return `${origin.replace(/\/$/, "")}${path}`;
}
