import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink } from "@/components/app-shell/page-header";
import { CustomFieldsPageContent } from "@/features/settings/components/custom-fields-page-content";
import { requireCompanyAdmin } from "@/lib/auth";

export default async function CustomFieldsSettingsPage() {
  await requireCompanyAdmin();

  return (
    <PageScroll maxWidth="4xl">
      <PageBackLink href="/settings/general">Back to settings</PageBackLink>
      <CustomFieldsPageContent />
    </PageScroll>
  );
}
