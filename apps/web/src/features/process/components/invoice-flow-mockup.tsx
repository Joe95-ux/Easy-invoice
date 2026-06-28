import { AppLogo } from "@/components/app-logo";

const lineItems = [
  { label: "Tile removal — 2 bathrooms", amount: "$600.00" },
  { label: "Drywall installation", amount: "$600.00" },
  { label: "Paint & finishing", amount: "$420.00" },
];

export function InvoiceFlowMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.75rem] bg-gradient-to-br from-primary/10 via-transparent to-accent/20 blur-xl" />
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg ring-1 ring-foreground/5">
        <div className="border-b border-border bg-muted/30 px-4 py-3">
          <AppLogo iconClassName="size-6" textClassName="text-sm" />
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-base font-semibold">Invoice</p>
              <p className="text-xs text-muted-foreground">#INV-0042 · Due Apr 15</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              Sent
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="font-medium text-muted-foreground">From</p>
              <p className="mt-0.5 font-medium text-foreground">Your business</p>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5">
              <p className="font-medium text-muted-foreground">Bill to</p>
              <p className="mt-0.5 font-medium text-foreground">Alex Rivera</p>
            </div>
          </div>

          <div className="mt-4 space-y-0.5 border-t border-border pt-3">
            {lineItems.map((line) => (
              <div
                key={line.label}
                className="flex items-center justify-between gap-2 py-1 text-xs"
              >
                <span className="text-foreground/80">{line.label}</span>
                <span className="shrink-0 font-medium tabular-nums">{line.amount}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="font-heading text-lg font-semibold tabular-nums">$1,620.00</span>
          </div>
        </div>
      </div>
    </div>
  );
}
