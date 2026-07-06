"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  SendIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePdfDownload } from "@/hooks/use-pdf-download";
import {
  formatDate,
  formatMoney,
  estimateStatusLabel,
  estimateStatusVariant,
} from "@/lib/estimates";
import type { ClientEstimateRow } from "@/lib/clients/financial-profile";

type ClientEstimatesTableProps = {
  estimates: ClientEstimateRow[];
  companyName: string;
};

export function ClientEstimatesTable({ estimates, companyName }: ClientEstimatesTableProps) {
  const router = useRouter();
  const { openPdfDownload, pdfDownloadDialog } = usePdfDownload();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  function handleDownload(estimate: ClientEstimateRow) {
    openPdfDownload({
      kind: "estimate",
      documentId: estimate.id,
      documentNumber: estimate.number,
      companyName,
    });
  }

  async function handleDelete(estimate: ClientEstimateRow) {
    if (!confirm(`Delete estimate ${estimate.number}?`)) return;

    setLoadingId(estimate.id);
    try {
      const response = await fetch(`/api/estimates/${estimate.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast.success("Estimate deleted");
      router.refresh();
    } catch {
      toast.error("Could not delete estimate");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      <Table stickyColumns={1} stickyColumnWidths={["5rem"]}>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="w-28 pl-4">Valid until</TableHead>
            <TableHead className="w-14 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimates.map((estimate) => (
            <TableRow key={estimate.id}>
              <TableCell className="font-medium">{estimate.number}</TableCell>
              <TableCell>
                <Badge variant={estimateStatusVariant(estimate.status)}>
                  {estimateStatusLabel(estimate.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(estimate.total, estimate.currency)}
              </TableCell>
              <TableCell className="pl-4 text-muted-foreground">
                {estimate.validUntil ? formatDate(estimate.validUntil) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="inline-flex size-8 cursor-pointer items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={loadingId === estimate.id}
                    aria-label="Estimate actions"
                  >
                    <MoreHorizontalIcon className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-44 w-48">
                    <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}`} />}>
                      <EyeIcon className="size-4" />
                      View
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}/edit`} />}>
                      <PencilIcon className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload(estimate)}>
                      <DownloadIcon className="size-4" />
                      Download PDF
                    </DropdownMenuItem>
                    {estimate.status !== "CANCELLED" &&
                      estimate.status !== "ACCEPTED" &&
                      estimate.status !== "DECLINED" && (
                        <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}`} />}>
                          <SendIcon className="size-4" />
                          Send estimate
                        </DropdownMenuItem>
                      )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => handleDelete(estimate)}
                    >
                      <Trash2Icon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {pdfDownloadDialog}
    </>
  );
}
