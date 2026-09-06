import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { FormTemplatesPageContent } from "@/features/settings/components/form-templates-page-content";
import { requireCompanyAdmin } from "@/lib/auth";

export default async function FormTemplatesSettingsPage() {
  await requireCompanyAdmin();

  return (
    <PageScroll maxWidth="4xl">
      <PageBackLink href="/settings/general">Back to settings</PageBackLink>
      <FormTemplatesPageContent />
    </PageScroll>
  );
}
