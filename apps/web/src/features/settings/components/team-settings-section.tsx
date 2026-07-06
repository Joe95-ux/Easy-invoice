"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamManagementPanel } from "@/features/team/components/team-management-panel";
import type { TeamData } from "@/features/team/types";

type TeamSettingsSectionProps = {
  initialData: TeamData;
};

/** @deprecated Use MembersPageContent at /members instead */
export function TeamSettingsSection({ initialData }: TeamSettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team</CardTitle>
        <CardDescription>
          Invite staff to help manage invoices, clients, and estimates for this company.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <TeamManagementPanel initialData={initialData} />
      </CardContent>
    </Card>
  );
}
