"use client";

import Link from "next/link";
import { ScrollTextIcon, SettingsIcon } from "lucide-react";
import { PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  MEMBERS_INFO,
  MembersInfoPopover,
  TeamManagementPanel,
} from "@/features/team/components/team-management-panel";
import type { TeamData } from "@/features/team/types";

type MembersPageContentProps = {
  initialData: TeamData;
};

export function MembersPageContent({ initialData }: MembersPageContentProps) {
  return (
    <>
      <PageHeader
        title="Members"
        titleAddon={
          <span className="hidden sm:inline-flex">
            <MembersInfoPopover />
          </span>
        }
        description={<span className="sm:hidden">{MEMBERS_INFO}</span>}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings/activity" />}
            >
              <ScrollTextIcon className="size-4" />
              Activity log
            </Button>
            <Button
              variant="outline"
              className={pageHeaderActionClass}
              render={<Link href="/settings" />}
            >
              <SettingsIcon className="size-4" />
              Settings
            </Button>
          </div>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <TeamManagementPanel initialData={initialData} />
        </CardContent>
      </Card>
    </>
  );
}
