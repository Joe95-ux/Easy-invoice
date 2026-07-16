import type { Prisma } from "@easy-invoice/db";
import { prisma, type QrCodeType } from "@/lib/db";
import { generatePublicToken } from "@/lib/document-tokens";
import { normalizeQrDesign } from "@/lib/qr-codes/design";
import type { QrDesign, SerializedQrCode } from "@/lib/qr-codes/types";

const QR_INCLUDE = {
  member: { select: { name: true, email: true } },
} satisfies Prisma.QrCodeInclude;

type QrCodeWithMember = Prisma.QrCodeGetPayload<{ include: typeof QR_INCLUDE }>;

export function serializeQrCode(qr: QrCodeWithMember): SerializedQrCode {
  return {
    id: qr.id,
    name: qr.name,
    type: qr.type,
    token: qr.token,
    content: (qr.content ?? {}) as Record<string, unknown>,
    design: normalizeQrDesign(qr.design),
    scanCount: qr.scanCount,
    lastScannedAt: qr.lastScannedAt?.toISOString() ?? null,
    createdAt: qr.createdAt.toISOString(),
    updatedAt: qr.updatedAt.toISOString(),
    createdByName: qr.member?.name ?? qr.member?.email ?? null,
  };
}

export async function getQrCodesForCompany(companyId: string): Promise<SerializedQrCode[]> {
  const codes = await prisma.qrCode.findMany({
    where: { companyId },
    include: QR_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return codes.map(serializeQrCode);
}

export async function getQrCodeForCompany(
  id: string,
  companyId: string,
): Promise<SerializedQrCode | null> {
  const qr = await prisma.qrCode.findFirst({
    where: { id, companyId },
    include: QR_INCLUDE,
  });
  return qr ? serializeQrCode(qr) : null;
}

/** Public lookup used by the scan resolver. */
export async function getQrCodeByToken(token: string) {
  return prisma.qrCode.findUnique({
    where: { token },
    include: { company: { select: { name: true, logoUrl: true } } },
  });
}

export async function recordQrScan(id: string): Promise<void> {
  await prisma.qrCode
    .update({
      where: { id },
      data: { scanCount: { increment: 1 }, lastScannedAt: new Date() },
    })
    .catch(() => undefined);
}

async function generateUniqueQrToken(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generatePublicToken();
    const existing = await prisma.qrCode.findUnique({
      where: { token },
      select: { id: true },
    });
    if (!existing) return token;
  }
  return generatePublicToken();
}

type CreateQrCodeInput = {
  companyId: string;
  memberId: string;
  name: string;
  type: QrCodeType;
  content: Record<string, unknown>;
  design: QrDesign;
};

export async function createQrCode(input: CreateQrCodeInput): Promise<SerializedQrCode> {
  const token = await generateUniqueQrToken();
  const qr = await prisma.qrCode.create({
    data: {
      companyId: input.companyId,
      memberId: input.memberId,
      name: input.name,
      type: input.type,
      token,
      content: input.content as Prisma.InputJsonValue,
      design: input.design as unknown as Prisma.InputJsonValue,
    },
    include: QR_INCLUDE,
  });
  return serializeQrCode(qr);
}

type UpdateQrCodeInput = {
  name?: string;
  content?: Record<string, unknown>;
  design?: QrDesign;
};

export async function updateQrCode(
  id: string,
  companyId: string,
  input: UpdateQrCodeInput,
): Promise<SerializedQrCode | null> {
  const existing = await prisma.qrCode.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!existing) return null;

  const qr = await prisma.qrCode.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.content !== undefined && {
        content: input.content as Prisma.InputJsonValue,
      }),
      ...(input.design !== undefined && {
        design: input.design as unknown as Prisma.InputJsonValue,
      }),
    },
    include: QR_INCLUDE,
  });
  return serializeQrCode(qr);
}

export async function deleteQrCode(id: string, companyId: string): Promise<boolean> {
  const result = await prisma.qrCode.deleteMany({ where: { id, companyId } });
  return result.count > 0;
}
