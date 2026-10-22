import type { Prisma } from "@easy-invoice/db";
import { getAppOrigin } from "@/lib/app-url";
import {
  normalizePaymentLinkUrl,
  normalizePaymentMethods,
  paymentLinkMethods,
  type CompanyPaymentMethod,
} from "@/lib/company-payment-methods";
import { prisma } from "@/lib/db";
import { DEFAULT_QR_DESIGN } from "@/lib/qr-codes/design";
import { renderQrDesignDataUrl, renderQrDesignSvg } from "@/lib/qr-codes/render-svg";
import {
  createQrCode,
  serializeQrCode,
} from "@/lib/qr-codes/service";
import type { QrDesign, SerializedQrCode } from "@/lib/qr-codes/types";
import { qrScanUrl } from "@/lib/qr-codes/url";

export type InvoicePaymentQrSummary = {
  qrCode: SerializedQrCode;
  paymentUrl: string;
  scanUrl: string;
  label: string;
};

function paymentUrlFromContent(content: Record<string, unknown>): string | null {
  return typeof content.url === "string" ? normalizePaymentLinkUrl(content.url) : null;
}

export async function getCompanyPaymentLinkMethods(
  companyId: string,
): Promise<CompanyPaymentMethod[]> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { paymentMethods: true },
  });
  return paymentLinkMethods(normalizePaymentMethods(company?.paymentMethods));
}

export async function getInvoicePaymentQr(
  invoiceId: string,
  companyId: string,
): Promise<InvoicePaymentQrSummary | null> {
  const qr = await prisma.qrCode.findFirst({
    where: {
      invoiceId,
      companyId,
      type: "LINK",
      status: { not: "DELETED" },
    },
    include: {
      member: { select: { name: true, email: true } },
      invoice: { select: { id: true, number: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!qr) return null;

  const paymentUrl = paymentUrlFromContent((qr.content ?? {}) as Record<string, unknown>);
  if (!paymentUrl) return null;

  const origin = await getAppOrigin();
  return {
    qrCode: serializeQrCode(qr),
    paymentUrl,
    scanUrl: qrScanUrl(origin, qr.token),
    label: qr.name,
  };
}

export async function upsertInvoicePaymentQr(options: {
  invoiceId: string;
  companyId: string;
  memberId: string;
  paymentUrl: string;
  methodLabel?: string;
}): Promise<InvoicePaymentQrSummary | { error: string }> {
  const paymentUrl = normalizePaymentLinkUrl(options.paymentUrl);
  if (!paymentUrl) {
    return { error: "Enter a valid payment link (https://…)" };
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: options.invoiceId, companyId: options.companyId },
    select: { id: true, number: true },
  });
  if (!invoice) {
    return { error: "Invoice not found" };
  }

  const label = options.methodLabel?.trim() || "Payment link";
  const name = `Pay ${invoice.number} · ${label}`.slice(0, 80);
  const content = { url: paymentUrl };

  const existing = await prisma.qrCode.findFirst({
    where: {
      invoiceId: options.invoiceId,
      companyId: options.companyId,
      type: "LINK",
      status: { not: "DELETED" },
    },
    select: { id: true },
    orderBy: { updatedAt: "desc" },
  });

  let qrCode: SerializedQrCode;

  if (existing) {
    const updated = await prisma.qrCode.update({
      where: { id: existing.id },
      data: {
        name,
        content: content as Prisma.InputJsonValue,
        status: "ACTIVE",
        invoiceId: options.invoiceId,
      },
      include: {
        member: { select: { name: true, email: true } },
        invoice: { select: { id: true, number: true } },
      },
    });
    qrCode = serializeQrCode(updated);
  } else {
    qrCode = await createQrCode({
      companyId: options.companyId,
      memberId: options.memberId,
      name,
      type: "LINK",
      content,
      design: DEFAULT_QR_DESIGN,
      invoiceId: options.invoiceId,
    });
  }

  const origin = await getAppOrigin();
  return {
    qrCode,
    paymentUrl,
    scanUrl: qrScanUrl(origin, qrCode.token),
    label: qrCode.name,
  };
}

export async function detachInvoicePaymentQr(
  invoiceId: string,
  companyId: string,
): Promise<boolean> {
  const result = await prisma.qrCode.updateMany({
    where: {
      invoiceId,
      companyId,
      type: "LINK",
      status: { not: "DELETED" },
    },
    data: {
      invoiceId: null,
      status: "DELETED",
    },
  });
  return result.count > 0;
}

/** Designed QR for invoice HTML/PDF — matches the workspace QR look. */
export async function buildPaymentQrImage(
  scanUrl: string,
  design?: QrDesign | null,
  companyLogoUrl?: string | null,
): Promise<{ imageDataUrl: string; svgMarkup: string }> {
  const svgMarkup = await renderQrDesignSvg(scanUrl, design, companyLogoUrl);
  return {
    svgMarkup,
    imageDataUrl: `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString("base64")}`,
  };
}

export async function buildPaymentQrImageDataUrl(
  scanUrl: string,
  design?: QrDesign | null,
  companyLogoUrl?: string | null,
): Promise<string> {
  return renderQrDesignDataUrl(scanUrl, design, companyLogoUrl);
}
