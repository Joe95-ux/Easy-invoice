import { PageScroll } from "@/components/app-shell/app-shell";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CompanyCreateForm } from "@/features/companies/components/company-create-form";
import { requireMember } from "@/lib/auth";

export default async function NewCompanyPage() {
  await requireMember();

  return (
    <PageScroll>
      <PageHeader
        title="Create company"
        description="Add another business to your account. Switch between companies anytime from the sidebar."
      />
      <Card className="max-w-2xl border-border/70">
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>
            This information appears on invoices you send to clients.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompanyCreateForm
            submitLabel="Create company"
            submittingLabel="Creating company..."
            showCancel
          />
        </CardContent>
      </Card>
    </PageScroll>
  );
}
