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

export function publicDocumentUrl(origin: string, kind: "invoice" | "estimate", token: string): string {
  const path = kind === "invoice" ? invoicePublicPath(token) : estimatePublicPath(token);
  return `${origin.replace(/\/$/, "")}${path}`;
}
