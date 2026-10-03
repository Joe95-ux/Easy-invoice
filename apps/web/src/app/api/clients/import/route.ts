import { NextResponse } from "next/server";
import {
  requireApiWriter,
  parseJsonBody,
  validationError,
} from "@/lib/api/validation";
import { prisma } from "@/lib/db";
import {
  MAX_CLIENT_IMPORT_ROWS,
  normalizeImportEmail,
  parseClientsCsvText,
} from "@/features/clients/lib/import-clients-csv";
import { z } from "zod";

const importSchema = z.object({
  csv: z.string().min(1, "CSV content is required").max(2_000_000),
});

export async function POST(request: Request) {
  const { member, response } = await requireApiWriter();
  if (response) return response;

  const body = await parseJsonBody<unknown>(request);
  if (body instanceof NextResponse) return body;

  const parsed = importSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const result = parseClientsCsvText(parsed.data.csv, {
    maxRows: MAX_CLIENT_IMPORT_ROWS,
  });

  if (result.rows.length === 0) {
    return NextResponse.json(
      {
        error: result.errors[0]?.message ?? "No valid client rows found",
        created: 0,
        skippedDuplicates: 0,
        skippedEmpty: result.skippedEmpty,
        errors: result.errors.slice(0, 20),
      },
      { status: 400 },
    );
  }

  // Skip emails that already exist in this company (case-insensitive).
  const emailKeys = [
    ...new Set(
      result.rows
        .map((row) => row.emailKey)
        .filter((key): key is string => Boolean(key)),
    ),
  ];

  const existingEmails = new Set<string>();
  if (emailKeys.length > 0) {
    // Chunk lookups — avoid huge OR / IN clauses on large imports.
    const CHUNK = 100;
    for (let i = 0; i < emailKeys.length; i += CHUNK) {
      const chunk = emailKeys.slice(i, i + CHUNK);
      const existing = await prisma.client.findMany({
        where: {
          companyId: member.companyId,
          OR: chunk.map((email) => ({
            email: { equals: email, mode: "insensitive" as const },
          })),
        },
        select: { email: true },
      });
      for (const row of existing) {
        if (row.email) existingEmails.add(normalizeImportEmail(row.email));
      }
    }
  }

  const seenInFile = new Set<string>();
  const toCreate: typeof result.rows = [];
  let skippedDuplicates = 0;

  for (const row of result.rows) {
    if (row.emailKey) {
      if (existingEmails.has(row.emailKey) || seenInFile.has(row.emailKey)) {
        skippedDuplicates += 1;
        continue;
      }
      seenInFile.add(row.emailKey);
    }
    toCreate.push(row);
  }

  // Batched creates — keep transactions small to avoid lock/lag.
  const BATCH = 50;
  let created = 0;
  for (let i = 0; i < toCreate.length; i += BATCH) {
    const slice = toCreate.slice(i, i + BATCH);
    await prisma.$transaction(
      slice.map((row) =>
        prisma.client.create({
          data: {
            companyId: member.companyId,
            name: row.input.name,
            email: row.input.email || null,
            phone: row.input.phone || null,
            address: row.input.address || null,
            city: row.input.city || null,
            state: row.input.state || null,
            zip: row.input.zip || null,
            country: row.input.country || null,
            notes: row.input.notes || null,
            defaultHourlyRate: row.input.defaultHourlyRate ?? null,
          },
        }),
      ),
    );
    created += slice.length;
  }

  return NextResponse.json({
    created,
    skippedDuplicates,
    skippedEmpty: result.skippedEmpty,
    errors: result.errors.slice(0, 20),
    errorCount: result.errors.length,
  });
}
