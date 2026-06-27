"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  DownloadIcon,
  EyeIcon,
  MoreHorizontalIcon,
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
import { downloadEstimatePdf } from "@/lib/estimate-pdf-client";
import {
  formatDate,
  formatMoney,
  estimateStatusLabel,
  estimateStatusVariant,
} from "@/lib/estimates";
import type { EstimateStatus } from "@easy-invoice/db";

export type EstimateRow = {
  id: string;
  number: string;
  status: EstimateStatus;
  total: string;
  currency: string;
  validUntil: string | null;
  clientName: string | null;
};

type EstimatesTableProps = {
  estimates: EstimateRow[];
};

export function EstimatesTable({ estimates }: EstimatesTableProps) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleDownload(estimate: EstimateRow) {
    setLoadingId(estimate.id);
    try {
      await downloadEstimatePdf(estimate.id, estimate.number);
      toast.success("PDF downloaded");
    } catch {
      toast.error("Could not generate PDF");
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(estimate: EstimateRow) {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Number</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-36 text-right">Total</TableHead>
          <TableHead className="w-40 pl-6">Valid until</TableHead>
          <TableHead className="w-14 text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {estimates.map((estimate) => (
          <TableRow key={estimate.id}>
            <TableCell>
              <Link href={`/estimates/${estimate.id}`} className="font-medium hover:underline">
                {estimate.number}
              </Link>
            </TableCell>
            <TableCell>{estimate.clientName ?? "—"}</TableCell>
            <TableCell>
              <Badge variant={estimateStatusVariant(estimate.status)}>
                {estimateStatusLabel(estimate.status)}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatMoney(estimate.total, estimate.currency)}
            </TableCell>
            <TableCell className="w-40 pl-6 text-muted-foreground">
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
                  <DropdownMenuItem
                    onClick={() => handleDownload(estimate)}
                  >
                    <DownloadIcon className="size-4" />
                    Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href={`/estimates/${estimate.id}`} />}>
                    <SendIcon className="size-4" />
                    Send estimate
                  </DropdownMenuItem>
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
  );
}
