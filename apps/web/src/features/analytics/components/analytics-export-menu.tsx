"use client";

import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AnalyticsData } from "@/features/analytics/types";
import {
  exportAgingCsv,
  exportTopClientsCsv,
} from "@/features/analytics/lib/export-csv";

type AnalyticsExportMenuProps = {
  data: AnalyticsData;
};

export function AnalyticsExportMenu({ data }: AnalyticsExportMenuProps) {
  const canExportClients = data.topClients.length > 0;
  const canExportAging = data.agingInvoices.length > 0;
  const disabled = !canExportClients && !canExportAging;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            disabled={disabled}
          />
        }
      >
        <DownloadIcon className="size-4" />
        <span className="hidden sm:inline">Export</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem
          disabled={!canExportClients}
          onClick={() =>
            exportTopClientsCsv(data.topClients, data.currency, data.periodLabel)
          }
        >
          Top clients CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canExportAging}
          onClick={() => exportAgingCsv(data.agingInvoices, data.currency)}
        >
          Outstanding aging CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
