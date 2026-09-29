import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAuditEventsCsv } from "@/lib/audit/csv";
import { listAuditEventsForExport } from "@/lib/audit/service";
import { requireApiCompanyAdmin } from "@/lib/api/validation";
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
});

export async function GET(request: Request) {
  const { member, response } = await requireApiCompanyAdmin();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: searchParams.get("category") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  const events = await listAuditEventsForExport(member.companyId, {
    category: parsed.data.category,
    from: parsed.data.from,
    to: parsed.data.to,
  });
  const csv = buildAuditEventsCsv(events);
  const suffix = parsed.data.category ? `-${parsed.data.category.toLowerCase()}` : "";
  const filename = `activity-log${suffix}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
