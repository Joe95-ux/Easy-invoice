import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
import { AUDIT_PAGE_SIZE_OPTIONS } from "@/lib/audit/constants";
import { listAuditEvents } from "@/lib/audit/service";
import { AuditCategory } from "@/lib/db";

const querySchema = z.object({
  category: z.nativeEnum(AuditCategory).optional(),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce
    .number()
    .int()
    .refine((n) => (AUDIT_PAGE_SIZE_OPTIONS as readonly number[]).includes(n), {
      message: "Invalid page size",
    })
    .optional(),
});

export async function GET(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const result = await listAuditEvents({
    companyId: member.companyId,
    category: parsed.data.category,
    from: parsed.data.from,
    to: parsed.data.to,
    page: parsed.data.page,
    pageSize: parsed.data.pageSize,
  });

  return NextResponse.json(result);
}
