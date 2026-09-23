import Link from "next/link";
import { PageScroll } from "@/components/app-shell/app-shell";
import { CustomFieldsPageContent } from "@/features/settings/components/custom-fields-page-content";
import { requireCompanyAdmin } from "@/lib/auth";

export default async function CustomFieldsSettingsPage() {
  await requireCompanyAdmin();

  return (
    <PageScroll maxWidth="85rem">
      <nav className="mb-5 text-sm text-muted-foreground" aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link
              href="/settings/general"
              className="transition-colors hover:text-foreground"
            >
              Settings
            </Link>
          </li>
          <li aria-hidden className="text-muted-foreground/60">
            ›
          </li>
          <li className="text-foreground">Custom fields</li>
        </ol>
      </nav>
      <CustomFieldsPageContent />
    </PageScroll>
  );
}
