import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import { listAuditEvents } from "@/lib/audit/service";
import { AuditCategory } from "@/lib/db";

const querySchema = z.object({
  category: z.nativeEnum(AuditCategory).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export async function GET(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const result = await listAuditEvents({
    companyId: member.companyId,
    category: parsed.data.category,
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  });

  return NextResponse.json(result);
}
