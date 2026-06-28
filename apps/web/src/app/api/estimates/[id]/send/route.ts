import { NextResponse } from "next/server";
import { requireApiMember, parseJsonBody, validationError } from "@/lib/api/validation";
import { getAppOrigin } from "@/lib/app-url";
import { publicDocumentUrl } from "@/lib/document-tokens";
import { sendEstimateEmail } from "@/lib/email";
import { generateEstimatePdfBuffer } from "@/lib/estimate-service";
import { formatMoney } from "@/lib/estimates";
import { ensureEstimatePublicToken } from "@/lib/public-documents";
import { prisma } from "@/lib/db";
import { z } from "zod";

const sendSchema = z.object({
  email: z.string().email().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { member, response } = await requireApiMember();
  if (response) return response;

  const { id } = await context.params;
  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const result = await generateEstimatePdfBuffer(id, member.companyId);
    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { estimate, pdfBuffer } = result;
    const recipientEmail = parsed.data.email ?? estimate.client?.email;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "Client email is required to send the estimate" },
        { status: 400 },
      );
    }

    await sendEstimateEmail({
      to: recipientEmail,
      companyName: estimate.company.name,
      estimateNumber: estimate.number,
      total: formatMoney(estimate.total, estimate.currency),
      pdfBuffer,
      viewUrl: publicDocumentUrl(
        await getAppOrigin(),
        "estimate",
        (await ensureEstimatePublicToken(id, member.companyId))!,
      ),
    });

    if (parsed.data.email && estimate.clientId) {
      await prisma.client.update({
        where: { id: estimate.clientId },
        data: { email: parsed.data.email },
      });
    }

    const updated = await prisma.estimate.update({
      where: { id },
      data: {
        status: estimate.status === "DRAFT" ? "SENT" : estimate.status,
        sentAt: estimate.sentAt ?? new Date(),
      },
      include: {
        client: true,
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
        template: true,
      },
    });

    return NextResponse.json({ estimate: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send estimate";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
