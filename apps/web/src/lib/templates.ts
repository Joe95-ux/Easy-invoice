import { prisma } from "@/lib/db";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";

export type TemplateSummary = Awaited<ReturnType<typeof getTemplatesForCompany>>[number];

const SYSTEM_SLUGS = SYSTEM_TEMPLATES.map((template) => template.slug);

async function reassignTemplateReferences(fromIds: string[], toId: string) {
  if (fromIds.length === 0) return;

  await prisma.$transaction([
    prisma.invoice.updateMany({
      where: { templateId: { in: fromIds } },
      data: { templateId: toId },
    }),
    prisma.estimate.updateMany({
      where: { templateId: { in: fromIds } },
      data: { templateId: toId },
    }),
    prisma.company.updateMany({
      where: { defaultTemplateId: { in: fromIds } },
      data: { defaultTemplateId: toId },
    }),
    prisma.invoiceTemplate.deleteMany({ where: { id: { in: fromIds } } }),
  ]);
}

async function syncSystemTemplateRow(
  templateId: string,
  definition: (typeof SYSTEM_TEMPLATES)[number],
) {
  await prisma.invoiceTemplate.update({
    where: { id: templateId },
    data: {
      name: definition.name,
      slug: definition.slug,
      html: definition.html,
      css: definition.css,
      isDefault: definition.isDefault,
    },
  });
}

/** Remove stale duplicates (e.g. old Telegraph rows) and orphan system slugs. */
async function pruneDuplicateSystemTemplates() {
  const systemTemplates = await prisma.invoiceTemplate.findMany({
    where: { isSystem: true, companyId: null },
    orderBy: { createdAt: "asc" },
  });

  const byName = new Map<string, typeof systemTemplates>();
  for (const template of systemTemplates) {
    const group = byName.get(template.name) ?? [];
    group.push(template);
    byName.set(template.name, group);
  }

  for (const [name, group] of byName) {
    if (group.length <= 1) continue;

    const definition = SYSTEM_TEMPLATES.find((template) => template.name === name);
    const keep = group[0];
    const removeIds = group.slice(1).map((template) => template.id);

    await reassignTemplateReferences(removeIds, keep.id);
    if (definition) {
      await syncSystemTemplateRow(keep.id, definition);
    }
  }

  const remaining = await prisma.invoiceTemplate.findMany({
    where: { isSystem: true, companyId: null },
  });

  for (const template of remaining) {
    if (SYSTEM_SLUGS.includes(template.slug)) continue;

    const definition = SYSTEM_TEMPLATES.find((entry) => entry.name === template.name);
    if (!definition) {
      await prisma.invoiceTemplate.delete({ where: { id: template.id } });
      continue;
    }

    const canonical = remaining.find(
      (entry) => entry.slug === definition.slug && entry.id !== template.id,
    );
    if (canonical) {
      await reassignTemplateReferences([template.id], canonical.id);
    } else {
      await syncSystemTemplateRow(template.id, definition);
    }
  }
}

export async function ensureSystemTemplates() {
  for (const template of SYSTEM_TEMPLATES) {
    const existing = await prisma.invoiceTemplate.findFirst({
      where: { slug: template.slug, isSystem: true, companyId: null },
    });

    if (existing) {
      await syncSystemTemplateRow(existing.id, template);
    } else {
      await prisma.invoiceTemplate.create({
        data: {
          name: template.name,
          slug: template.slug,
          html: template.html,
          css: template.css,
          isDefault: template.isDefault,
          isSystem: true,
        },
      });
    }
  }

  await pruneDuplicateSystemTemplates();
}

function sortTemplatesByDefinitionOrder<
  T extends { slug: string; isSystem: boolean; name: string },
>(templates: T[]): T[] {
  const slugOrder = new Map(SYSTEM_TEMPLATES.map((template, index) => [template.slug, index]));

  return [...templates].sort((a, b) => {
    if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;

    if (a.isSystem && b.isSystem) {
      const orderA = slugOrder.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
      const orderB = slugOrder.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
    }

    return a.name.localeCompare(b.name);
  });
}

export async function getTemplatesForCompany(companyId: string) {
  await ensureSystemTemplates();

  const templates = await prisma.invoiceTemplate.findMany({
    where: {
      OR: [{ isSystem: true, companyId: null }, { companyId }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      isDefault: true,
      isSystem: true,
    },
  });

  return sortTemplatesByDefinitionOrder(templates);
}

export async function getDefaultTemplateId(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { defaultTemplateId: true },
  });
  if (company?.defaultTemplateId) return company.defaultTemplateId;

  const templates = await getTemplatesForCompany(companyId);
  return (
    templates.find((t) => t.isDefault)?.id ??
    templates.find((t) => t.slug === "classic")?.id ??
    templates[0]?.id
  );
}

export async function setCompanyDefaultTemplate(companyId: string, templateId: string) {
  const template = await getTemplateById(templateId, companyId);
  if (!template) throw new Error("Template not found");

  await prisma.company.update({
    where: { id: companyId },
    data: { defaultTemplateId: templateId },
  });
}

export async function getTemplateById(templateId: string, companyId: string) {
  await ensureSystemTemplates();

  return prisma.invoiceTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ isSystem: true, companyId: null }, { companyId }],
    },
  });
}
