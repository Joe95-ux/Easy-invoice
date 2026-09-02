import Link from "next/link";
import { BriefcaseIcon, PlusIcon } from "lucide-react";
import { PageScroll } from "@/components/app-shell/app-shell";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProjectsTable } from "@/features/projects/components/projects-table";
import { requireMember } from "@/lib/auth";
import { getProjectsForCompany, serializeProjectListItem } from "@/lib/projects";

export default async function ProjectsPage() {
  const member = await requireMember();
  const projects = await getProjectsForCompany(member.companyId);
  const rows = projects.map(serializeProjectListItem);

  return (
    <PageScroll>
      <PageHeader
        title="Projects"
        description="Group estimates, invoices, and time for a job — optional, freestanding docs still work."
        actions={
          <Button className={pageHeaderActionClass} render={<Link href="/projects/new" />}>
            <PlusIcon className="size-4" />
            New project
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BriefcaseIcon}
          title="No projects yet"
          description="Create a project from an accepted estimate, or start one here and link docs as you go."
          action={
            <Button render={<Link href="/projects/new" />}>
              <PlusIcon className="size-4" />
              Create your first project
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden py-0">
          <ProjectsTable projects={rows} />
        </Card>
      )}
    </PageScroll>
  );
}
