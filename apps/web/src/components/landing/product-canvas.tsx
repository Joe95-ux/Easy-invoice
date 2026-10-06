import {
  BellIcon,
  BriefcaseIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  PackageIcon,
  QrCodeIcon,
  RefreshCwIcon,
  SearchIcon,
  UsersRoundIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard", icon: LayoutDashboardIcon },
  { label: "Invoices", icon: FileTextIcon },
  { label: "Recurring", icon: RefreshCwIcon },
  { label: "Estimates", icon: ClipboardListIcon },
  { label: "Projects", icon: BriefcaseIcon },
  { label: "Templates", icon: LayoutTemplateIcon },
  { label: "Clients", icon: UsersRoundIcon },
  { label: "Products", icon: PackageIcon },
  { label: "Time", icon: ClockIcon },
  { label: "Follow-ups", icon: CheckSquareIcon },
  { label: "QR codes", icon: QrCodeIcon },
  { label: "Notifications", icon: BellIcon },
] as const;

const INVOICES = [
  { number: "INV-0048", client: "Rivera Homes", due: "Sep 12", total: "$1,620.00", status: "Sent" },
  { number: "INV-0047", client: "Oak Street LLC", due: "Sep 8", total: "$840.00", status: "Paid" },
  { number: "INV-0046", client: "Northside Clean", due: "Sep 4", total: "$390.00", status: "Overdue" },
  { number: "INV-0045", client: "Bright HVAC", due: "Aug 30", total: "$2,150.00", status: "Paid" },
  { number: "INV-0044", client: "Maple Dental", due: "Aug 28", total: "$475.00", status: "Viewed" },
  { number: "INV-0043", client: "Harbor Cafe", due: "Aug 22", total: "$1,080.00", status: "Paid" },
  { number: "INV-0042", client: "Westside Glass", due: "Aug 18", total: "$720.00", status: "Draft" },
  { number: "INV-0041", client: "Pine Ridge HOA", due: "Aug 14", total: "$3,240.00", status: "Sent" },
  { number: "INV-0040", client: "Keller Builders", due: "Aug 10", total: "$1,890.00", status: "Partially paid" },
  { number: "INV-0039", client: "Summit Roofing", due: "Aug 6", total: "$560.00", status: "Paid" },
] as const;

/**
 * Static invoices workspace mock for the hero — looks like the app,
 * no inner scroll, no clickable chrome.
 */
export function ProductCanvas() {
  return (
    <div className="landing-hero-frame relative mx-auto max-w-5xl overflow-hidden rounded-xl">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-[11px] text-muted-foreground">
          app.invoicedesk.app / invoices
        </span>
      </div>

      <div className="md:grid md:grid-cols-[12.5rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-muted/20 md:flex md:flex-col">
          <div className="flex items-center gap-2 px-3 py-3">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-[10px] font-semibold text-primary-foreground">
              ID
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">Acme Trades</p>
              <p className="truncate text-[10px] text-muted-foreground">Pro plan</p>
            </div>
          </div>
          <p className="px-5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Workspace
          </p>
          <ul className="px-2 pb-3 text-[13px]">
            {NAV.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1",
                  item.label === "Invoices"
                    ? "bg-background font-medium text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground",
                )}
              >
                <item.icon className="size-3.5 shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-border px-3 py-3">
            <p className="text-[11px] text-muted-foreground">Open balance</p>
            <p className="mt-0.5 text-sm font-medium tabular-nums">$7,535</p>
            <p className="text-[10px] text-muted-foreground">5 unpaid</p>
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
            <div>
              <h3 className="text-sm font-medium tracking-tight">Invoices</h3>
              <p className="text-xs text-muted-foreground">{INVOICES.length} this month</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline-flex">
                <SearchIcon className="size-3" />
                Search
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
                <FileTextIcon className="size-3" />
                New invoice
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2 sm:px-5">
            {["All", "Sent", "Paid", "Overdue"].map((item) => (
              <span
                key={item}
                className={cn(
                  "rounded-md px-2.5 py-1 text-[11px] font-medium",
                  item === "All" ? "bg-muted text-foreground" : "text-muted-foreground",
                )}
              >
                {item}
              </span>
            ))}
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="px-4 py-2 font-medium sm:px-5">Number</th>
                <th className="px-3 py-2 font-medium">Client</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">Due</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium sm:px-5">Total</th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((row, i) => (
                <tr
                  key={row.number}
                  className={cn(
                    "border-b border-border/70 last:border-0",
                    i === 0 && "bg-muted/50",
                  )}
                >
                  <td className="px-4 py-2 font-medium tabular-nums sm:px-5">{row.number}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row.client}</td>
                  <td className="hidden px-3 py-2 tabular-nums text-muted-foreground sm:table-cell">
                    {row.due}
                  </td>
                  <td className="px-3 py-2">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums sm:px-5">{row.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Paid"
      ? "text-success"
      : status === "Overdue"
        ? "text-destructive"
        : status === "Partially paid"
          ? "text-warning"
          : "text-muted-foreground";
  return <span className={cn("text-[11px] font-medium", tone)}>{status}</span>;
}
