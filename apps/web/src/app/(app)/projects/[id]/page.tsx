import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  PlusIcon,
} from "lucide-react";
import { PageScroll } from "@/components/app-shell/app-shell";
import { PageBackLink, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectFormsSection } from "@/features/projects/components/project-forms-section";
import { ProjectLogTimeButton } from "@/features/projects/components/project-log-time-button";
import { ProjectStatusSelect } from "@/features/projects/components/project-status-select";
import { requireMember } from "@/lib/auth";
import { getClientsForMember } from "@/lib/clients";
import type { EstimateStatus, InvoiceStatus } from "@/lib/db";
import { estimateStatusLabel, estimateStatusVariant } from "@/lib/estimates";
import { listProjectForms, serializeProjectForm } from "@/lib/project-forms";
import { formatDate, formatMoney, invoiceStatusLabel, invoiceStatusVariant } from "@/lib/invoices";
import {
  getProjectForCompany,
  projectStatusLabel,
  projectStatusVariant,
  serializeProjectDetail,
} from "@/lib/projects";
import { formatDuration } from "@/lib/time-tracking/format";
import { getRecentTimeDescriptions } from "@/lib/time-tracking/service";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";

type PageProps = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: PageProps) {
  const member = await requireMember();
  const { id } = await params;
  const [project, clients, recentDescriptions, formRows] = await Promise.all([
    getProjectForCompany(id, member.companyId),
    getClientsForMember(member.companyId),
    getRecentTimeDescriptions(member.companyId),
    listProjectForms(member.companyId, id).catch(() => []),
  ]);
  if (!project) notFound();

  const detail = serializeProjectDetail(project);
  const forms = formRows.map(serializeProjectForm);
  const { financials } = detail;
  const canInvoiceUnbilled =
    Boolean(detail.client?.id) && detail.unbilledTimeIds.length > 0;
  const defaultHourlyRate = member.company.defaultHourlyRate
    ? Number(member.company.defaultHourlyRate)
    : null;

  return (
    <PageScroll>
      <PageBackLink href="/projects">Back to projects</PageBackLink>

      <PageHeader
        title={detail.name}
        titleAddon={
          <Badge variant={projectStatusVariant(detail.status)}>
            {projectStatusLabel(detail.status)}
          </Badge>
        }
        description={
          <>
            {detail.client ? (
              <Link href={`/clients/${detail.client.id}`} className="hover:underline">
                {detail.client.name}
              </Link>
            ) : (
              "No client linked"
            )}
            {detail.dueDate ? ` · Due ${formatDate(detail.dueDate)}` : null}
          </>
        }
        actions={
          <div className={`flex w-full flex-col gap-2 sm:w-auto sm:flex-row ${pageHeaderActionClass}`}>
            <ProjectStatusSelect projectId={detail.id} status={detail.status} />
            {detail.client?.id ? (
              <>
                <Button
                  variant="outline"
                  className="flex-1 sm:flex-none"
                  render={
                    <Link
                      href={`/estimates/new?clientId=${detail.client.id}&projectId=${detail.id}`}
                    />
                  }
                >
                  <ClipboardListIcon className="size-4" />
                  New estimate
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  render={
                    <Link
                      href={`/invoices/new?clientId=${detail.client.id}&projectId=${detail.id}`}
                    />
                  }
                >
                  <PlusIcon className="size-4" />
                  New invoice
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Invoiced</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(financials.invoiced, financials.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(financials.paid, financials.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatMoney(financials.remaining, financials.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {financials.budget == null
                ? "—"
                : formatMoney(financials.budget, financials.currency)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {canInvoiceUnbilled ? (
        <Card className="mb-6 border-dashed">
          <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">
                {formatDuration(financials.unbilledMinutes)} unbilled ·{" "}
                {formatMoney(financials.unbilledAmount, financials.currency)}
              </p>
              <p className="text-sm text-muted-foreground">
                Billable time on this project that is not on an invoice yet.
              </p>
            </div>
            <Button
              render={
                <Link
                  href={invoiceFromTimeUrl({
                    clientId: detail.client!.id,
                    timeEntryIds: detail.unbilledTimeIds,
                    projectId: detail.id,
                  })}
                />
              }
            >
              <FileTextIcon className="size-4" />
              Invoice unbilled time
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Estimates</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {detail.estimates.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No estimates linked yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.estimates.map((estimate) => (
                    <TableRow key={estimate.id}>
                      <TableCell>
                        <Link
                          href={`/estimates/${estimate.id}`}
                          className="font-medium hover:underline"
                        >
                          {estimate.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={estimateStatusVariant(estimate.status as EstimateStatus)}>
                          {estimateStatusLabel(estimate.status as EstimateStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(estimate.total, estimate.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-4">
            <CardTitle className="text-base">Invoices</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {detail.invoices.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No invoices linked yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detail.invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusVariant(invoice.status as InvoiceStatus)}>
                          {invoiceStatusLabel(invoice.status as InvoiceStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(invoice.total, invoice.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClockIcon className="size-4" />
            Time
          </CardTitle>
          <div className="flex items-center gap-2">
            <ProjectLogTimeButton
              projectId={detail.id}
              projectName={detail.name}
              clientId={detail.client?.id ?? null}
              clients={clients}
              defaultHourlyRate={defaultHourlyRate}
              recentDescriptions={recentDescriptions}
            />
            {detail.client?.id ? (
              <Button
                size="sm"
                variant="outline"
                render={<Link href={`/time?clientId=${detail.client.id}`} />}
              >
                Open time
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {detail.timeEntries.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No time entries linked to this project yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Billed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.timeEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(entry.date)}
                    </TableCell>
                    <TableCell>{entry.description || "—"}</TableCell>
                    <TableCell>{formatDuration(entry.durationMinutes)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(entry.amount, detail.currency)}
                    </TableCell>
                    <TableCell>
                      {entry.invoicedAt ? (
                        entry.invoiceId ? (
                          <Link
                            href={`/invoices/${entry.invoiceId}`}
                            className="text-sm hover:underline"
                          >
                            Invoiced
                          </Link>
                        ) : (
                          "Invoiced"
                        )
                      ) : entry.billable ? (
                        "Unbilled"
                      ) : (
                        "Non-billable"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <ProjectFormsSection projectId={detail.id} forms={forms} />
      </div>

      {detail.notes ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{detail.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </PageScroll>
  );
}
