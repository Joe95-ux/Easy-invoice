import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import { companyBrandingFields } from "@/lib/company-branding";
import { formatSubmissionAsScope } from "@/lib/form-submission-to-estimate";
import { getFormSubmissionForEstimatePrefill } from "@/lib/project-forms";
import { getDefaultTemplateId, getTemplatesForCompany } from "@/lib/templates";
import { EstimateCreator } from "@/features/estimates/components/estimate-creator";

type PageProps = {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    addTime?: string;
    timeEntryIds?: string;
    submissionId?: string;
  }>;
};

export default async function NewEstimatePage({ searchParams }: PageProps) {
  const member = await requireMember();

  const { clientId, projectId, addTime, timeEntryIds, submissionId } = await searchParams;
  const preselectedTimeEntryIds = timeEntryIds
    ? timeEntryIds.split(",").filter(Boolean)
    : [];

  const [clients, templates, defaultTemplateId, submissionPrefill] = await Promise.all([
    getClientsForMember(member.companyId),
    getTemplatesForCompany(member.companyId),
    getDefaultTemplateId(member.companyId),
    submissionId
      ? getFormSubmissionForEstimatePrefill(member.companyId, submissionId)
      : Promise.resolve(null),
  ]);

  const resolvedClientId = clientId || submissionPrefill?.clientId || undefined;
  const resolvedProjectId = projectId || submissionPrefill?.projectId || undefined;
  const scopeFromSubmission = submissionPrefill
    ? formatSubmissionAsScope({
        formName: submissionPrefill.formName,
        fields: submissionPrefill.fields,
        answers: submissionPrefill.answers,
        submitterName: submissionPrefill.submitterName,
        submitterEmail: submissionPrefill.submitterEmail,
      })
    : undefined;

  return (
    <PageScroll>
      <PageBackLink
        href={resolvedProjectId ? `/projects/${resolvedProjectId}` : "/estimates"}
      >
        {resolvedProjectId ? "Back to project" : "Back to estimates"}
      </PageBackLink>
      <EstimateCreator
        currency={member.company.currency}
        company={{
          name: member.company.name,
          logoUrl: member.company.logoUrl,
          ...companyBrandingFields(member.company),
          email: member.company.email,
          phone: member.company.phone,
          address: member.company.address,
          city: member.company.city,
          state: member.company.state,
          zip: member.company.zip,
          country: member.company.country,
        }}
        clients={clients}
        templates={templates}
        initialClientId={resolvedClientId}
        initialProjectId={resolvedProjectId}
        defaultTemplateId={defaultTemplateId}
        autoOpenTimeDialog={addTime === "1"}
        preselectedTimeEntryIds={preselectedTimeEntryIds}
        initialValues={
          scopeFromSubmission
            ? {
                scope: scopeFromSubmission,
                notes: submissionPrefill
                  ? `Created from form “${submissionPrefill.formName}”.`
                  : undefined,
              }
            : undefined
        }
      />
    </PageScroll>
  );
}
