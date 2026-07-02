import { CompanySettingsForm } from "@/features/settings/components/company-settings-form";
import { ReminderSettingsSection } from "@/features/settings/components/reminder-settings-section";
import { SettingsDefaultTemplateSection } from "@/features/settings/components/settings-default-template-section";
import { TeamSettingsSection } from "@/features/settings/components/team-settings-section";
import { requireCompanyAdmin } from "@/lib/auth";
import { canManageTeam } from "@/lib/team";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { prisma } from "@/lib/db";
import { resolveMemberLoginEmails } from "@/lib/member-email";
import { normalizeLogoBg, normalizeLogoPlacement } from "@/lib/company-branding";
import { reminderSettingsFromCompany } from "@/lib/reminders/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";

export default async function SettingsPage() {
  const member = await requireCompanyAdmin();

  const [templates, defaultTemplateId, members, invites] = await Promise.all([
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
    prisma.companyMember.findMany({
      where: { companyId: member.companyId },
      orderBy: { createdAt: "asc" },
    }),
    canManageTeam(member.role)
      ? prisma.companyInvite.findMany({
          where: {
            companyId: member.companyId,
            acceptedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);
  const { company } = member;

  const roleOrder = { OWNER: 0, ADMIN: 1, MEMBER: 2 } as const;
  const sortedMembers = [...members].sort(
    (a, b) => roleOrder[a.role] - roleOrder[b.role],
  );
  const membersWithEmails = await resolveMemberLoginEmails(sortedMembers);

  const teamData = {
    currentMemberId: member.id,
    currentRole: member.role,
    members: membersWithEmails.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      isCurrentUser: row.clerkId === member.clerkId,
    })),
    invites: invites.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    })),
  };

  const companyPreview = {
    name: company.name,
    logoUrl: company.logoUrl,
    logoBg: normalizeLogoBg(company.logoBg),
    logoPlacement: normalizeLogoPlacement(company.logoPlacement),
    brandColor: company.brandColor,
    email: company.email,
    phone: company.phone,
    address: company.address,
    city: company.city,
    state: company.state,
    zip: company.zip,
    country: company.country,
  };

  return (
    <PageScroll>
      <PageHeader
        title="Settings"
        description="Manage your company profile and invoice preferences."
      />

      <div className="space-y-6">
        <CompanySettingsForm
          initialLogoUrl={company.logoUrl}
          initialValues={{
            name: company.name,
            email: company.email ?? "",
            phone: company.phone ?? "",
            address: company.address ?? "",
            city: company.city ?? "",
            state: company.state ?? "",
            zip: company.zip ?? "",
            country: company.country,
            currency: company.currency,
            locale: company.locale,
            taxId: company.taxId ?? "",
            defaultHourlyRate: company.defaultHourlyRate
              ? Number(company.defaultHourlyRate)
              : null,
            logoBg: normalizeLogoBg(company.logoBg),
            logoPlacement: normalizeLogoPlacement(company.logoPlacement),
            brandColor: company.brandColor,
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Invoice templates</CardTitle>
          </CardHeader>
          <CardContent>
            <SettingsDefaultTemplateSection
              templates={templates}
              defaultTemplateId={defaultTemplateId ?? templates[0]?.id ?? ""}
              company={companyPreview}
              currency={company.currency}
            />
          </CardContent>
        </Card>

        <ReminderSettingsSection
          initialSettings={reminderSettingsFromCompany(company)}
        />

        <TeamSettingsSection initialData={teamData} />
      </div>
    </PageScroll>
  );
}
