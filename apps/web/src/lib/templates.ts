import { prisma } from "@/lib/db";
import { SYSTEM_TEMPLATES } from "@/lib/invoice-templates/definitions";

export async function ensureSystemTemplates() {
  for (const template of SYSTEM_TEMPLATES) {
    const existing = await prisma.invoiceTemplate.findFirst({
      where: { slug: template.slug, isSystem: true, companyId: null },
    });

    if (existing) {
      await prisma.invoiceTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          html: template.html,
          css: template.css,
          isDefault: template.isDefault,
        },
      });
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
}

export async function getTemplatesForCompany(companyId: string) {
  await ensureSystemTemplates();

  return prisma.invoiceTemplate.findMany({
    where: {
      OR: [{ isSystem: true, companyId: null }, { companyId }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      isDefault: true,
      isSystem: true,
    },
  });
}

export async function getDefaultTemplateId(companyId: string) {
  const templates = await getTemplatesForCompany(companyId);
  return (
    templates.find((t) => t.isDefault)?.id ??
    templates.find((t) => t.slug === "classic")?.id ??
    templates[0]?.id
  );
}

export async function getTemplateById(templateId: string, companyId: string) {
  return prisma.invoiceTemplate.findFirst({
    where: {
      id: templateId,
      OR: [{ isSystem: true, companyId: null }, { companyId }],
    },
  });
}
