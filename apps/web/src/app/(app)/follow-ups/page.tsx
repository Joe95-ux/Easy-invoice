import { PageScroll } from "@/components/app-shell/app-shell";
import { FollowUpsPageContent } from "@/features/follow-ups/components/follow-ups-page-content";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { prisma } from "@/lib/db";
import {
  getFollowUpsForCompany,
  serializeFollowUp,
  syncFollowUpSuggestions,
} from "@/lib/follow-ups/service";

export default async function FollowUpsPage() {
  const member = await requireMember();

  try {
    // Keep the checklist current with overdue invoices / expiring estimates.
    await syncFollowUpSuggestions(member.companyId, member.id);
  } catch {
    // Page still loads; user can retry via Sync suggestions.
  }

  const [followUps, clients, invoices, estimates, members] = await Promise.all([
    getFollowUpsForCompany(member.companyId),
    getClientsForMember(member.companyId),
    prisma.invoice.findMany({
      where: { companyId: member.companyId },
      select: { id: true, number: true, clientId: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.estimate.findMany({
      where: { companyId: member.companyId },
      select: { id: true, number: true, clientId: true, client: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.companyMember.findMany({
      where: { companyId: member.companyId },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <PageScroll>
      <FollowUpsPageContent
        initialFollowUps={followUps.map(serializeFollowUp)}
        currentMemberId={member.id}
        clients={clients.map((client) => ({ id: client.id, label: client.name }))}
        invoices={invoices.map((invoice) => ({
          id: invoice.id,
          label: invoice.client?.name
            ? `${invoice.number} · ${invoice.client.name}`
            : invoice.number,
          clientId: invoice.clientId,
        }))}
        estimates={estimates.map((estimate) => ({
          id: estimate.id,
          label: estimate.client?.name
            ? `${estimate.number} · ${estimate.client.name}`
            : estimate.number,
          clientId: estimate.clientId,
        }))}
        members={members.map((row) => ({
          id: row.id,
          label: row.name?.trim() || row.email,
        }))}
      />
    </PageScroll>
  );
}
