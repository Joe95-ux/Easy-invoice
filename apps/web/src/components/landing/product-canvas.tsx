"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BellIcon,
  BellRingIcon,
  BriefcaseIcon,
  CalendarIcon,
  CheckIcon,
  CheckSquareIcon,
  ClipboardListIcon,
  ClockIcon,
  FileTextIcon,
  GripVerticalIcon,
  LayoutDashboardIcon,
  LayoutTemplateIcon,
  LinkIcon,
  Loader2Icon,
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
] as const;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** September 2026 — the 1st is a Tuesday. */
const SEP_CELLS: Array<number | null> = [
  null, null, 1, 2, 3, 4, 5,
  6, 7, 8, 9, 10, 11, 12,
  13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26,
  27, 28, 29, 30, null, null, null,
];

const FROM_DAY = 4;
const TO_DAY = 11;

type Beat = "list" | "chase" | "paid";
type Cue =
  | "idle"
  | "select"
  | "viewed"
  | "enter"
  | "lift"
  | "drag"
  | "drop"
  | "open"
  | "remind"
  | "sent"
  | "closed"
  | "status"
  | "hold";

const SCRIPT: { beat: Beat; cue: Cue; ms: number }[] = [
  { beat: "list", cue: "idle", ms: 1100 },
  { beat: "list", cue: "select", ms: 1000 },
  { beat: "list", cue: "viewed", ms: 1500 },
  { beat: "chase", cue: "enter", ms: 1000 },
  { beat: "chase", cue: "lift", ms: 550 },
  { beat: "chase", cue: "drag", ms: 850 },
  { beat: "chase", cue: "drop", ms: 700 },
  { beat: "chase", cue: "open", ms: 1400 },
  { beat: "chase", cue: "remind", ms: 1100 },
  { beat: "chase", cue: "sent", ms: 1300 },
  { beat: "chase", cue: "closed", ms: 1100 },
  { beat: "paid", cue: "status", ms: 2000 },
  { beat: "paid", cue: "hold", ms: 2400 },
];

const TOUR = [
  { beat: "list" as const, label: "Unpaid", hint: "See what’s still open" },
  { beat: "chase" as const, label: "Follow up", hint: "Open the overdue item" },
  { beat: "paid" as const, label: "Get paid", hint: "The invoice updates itself" },
];

/**
 * Autoplay of how Invoice Desk actually works: an overdue invoice
 * becomes a follow-up, you remind from the item, payment closes both.
 */
export function ProductCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [step, setStep] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.25 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced || !inView) return;
    const timer = window.setTimeout(() => {
      if (step >= SCRIPT.length - 1) {
        setFading(true);
        fadeTimer.current = setTimeout(() => {
          setStep(0);
          setFading(false);
        }, 420);
        return;
      }
      setStep((current) => current + 1);
    }, SCRIPT[step]?.ms ?? 1600);
    return () => {
      window.clearTimeout(timer);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, [step, reduced, inView]);

  const scene = reduced ? { beat: "list" as Beat, cue: "idle" as Cue } : SCRIPT[step]!;
  const beat = scene.beat;
  const cue = scene.cue;
  const onCalendar = beat === "chase";
  const selected = cue === "idle" ? "INV-0048" : "INV-0046";
  const paid = beat === "paid";
  const reminderMoved = ["drop", "open", "remind", "sent", "closed"].includes(cue) || beat === "paid";
  const lifting = cue === "lift" || cue === "drag";
  const itemOpen = ["open", "remind", "sent", "closed"].includes(cue);
  const itemDone = cue === "closed" || beat === "paid";

  const navActive = onCalendar ? "Follow-ups" : "Invoices";
  const toast =
    cue === "viewed"
      ? "Opened the pay link · still unpaid"
      : cue === "sent"
        ? "Reminder sent ·  jobs@northsideclean.com"
        : cue === "status"
          ? "Payment received · $390.00"
          : null;

  function jumpTo(next: Beat) {
    const index = SCRIPT.findIndex((item) => item.beat === next);
    if (index >= 0) {
      setFading(false);
      setStep(index);
    }
  }

  return (
    <div
      ref={rootRef}
      className="landing-hero-frame relative mx-auto max-w-5xl overflow-hidden rounded-xl"
      role="img"
      aria-label="Demo: an overdue invoice becomes a follow-up, you send a reminder, then it is paid"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate text-[11px] text-muted-foreground">
          app.invoicedesk.app / {onCalendar ? "follow-ups" : "invoices"}
        </span>
      </div>

      <div
        className={cn(
          "grid h-[32rem] grid-cols-[12.5rem_minmax(0,1fr)] transition-opacity duration-300 ease-out",
          fading && "opacity-0",
        )}
      >
        <aside className="flex flex-col border-r border-border bg-muted/20">
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
          <ul className="px-2 text-[13px]">
            {NAV.map((item) => (
              <li
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1 transition-colors duration-300",
                  item.label === navActive
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
            <p className="mt-0.5 text-sm font-medium tabular-nums">
              {paid ? "$7,145" : "$7,535"}
            </p>
            <p className="text-[10px] text-muted-foreground">{paid ? "4 unpaid" : "5 unpaid"}</p>
          </div>
        </aside>

        <div className="relative min-w-0 overflow-hidden">
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              onCalendar ? "pointer-events-none opacity-0" : "opacity-100",
            )}
          >
            <InvoicesView selected={selected} paid={paid} />
          </div>
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              onCalendar ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          >
            <CalendarView
              active={onCalendar}
              lifting={lifting}
              flying={cue === "drag"}
              moved={reminderMoved}
              itemOpen={itemOpen}
              itemDone={itemDone}
              reminding={cue === "remind"}
              sent={cue === "sent" || cue === "closed"}
            />
          </div>

          {toast ? (
            <div
              key={toast}
              className="landing-pop-in absolute bottom-4 right-4 z-20 max-w-[17rem] rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground"
            >
              {toast}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-border">
        {TOUR.map((item) => {
          const active = beat === item.beat;
          return (
            <button
              key={item.beat}
              type="button"
              onClick={() => jumpTo(item.beat)}
              className={cn(
                "relative px-4 py-3 text-left transition-colors",
                active ? "bg-muted/40" : "hover:bg-muted/25",
              )}
            >
              {active ? (
                <span className="absolute inset-x-4 top-0 h-px bg-foreground" />
              ) : null}
              <p className={cn("text-xs font-medium", !active && "text-muted-foreground")}>
                {item.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{item.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InvoicesView({
  selected,
  paid,
}: {
  selected: string;
  paid: boolean;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-medium tracking-tight">Invoices</h3>
          <p className="text-xs text-muted-foreground">{INVOICES.length} this month</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground">
            <SearchIcon className="size-3" />
            Search
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">
            <FileTextIcon className="size-3" />
            New invoice
          </span>
        </div>
      </div>
      <div className="flex gap-1.5 border-b border-border px-5 py-2">
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
            <th className="px-5 py-2 font-medium">Number</th>
            <th className="px-3 py-2 font-medium">Client</th>
            <th className="px-3 py-2 font-medium">Due</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-5 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {INVOICES.map((row) => {
            const status = row.number === "INV-0046" && paid ? "Paid" : row.status;
            return (
              <tr
                key={row.number}
                className={cn(
                  "border-b border-border/70 last:border-0 transition-colors duration-300",
                  selected === row.number && "bg-muted/50",
                )}
              >
                <td className="px-5 py-2 font-medium tabular-nums">{row.number}</td>
                <td className="px-3 py-2 text-muted-foreground">{row.client}</td>
                <td className="px-3 py-2 tabular-nums text-muted-foreground">{row.due}</td>
                <td className="px-3 py-2">
                  <StatusPill status={status} />
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{row.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CalendarView({
  active,
  lifting,
  flying,
  moved,
  itemOpen,
  itemDone,
  reminding,
  sent,
}: {
  active: boolean;
  lifting: boolean;
  flying: boolean;
  moved: boolean;
  itemOpen: boolean;
  itemDone: boolean;
  reminding: boolean;
  sent: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);
  const [ghost, setGhost] = useState<{ x: number; y: number; w: number } | null>(null);

  useLayoutEffect(() => {
    if (!active || moved) {
      setGhost(null);
      return;
    }
    const root = rootRef.current;
    const from = fromRef.current;
    const to = toRef.current;
    if (!root || !from) return;
    const origin = from.getBoundingClientRect();
    const box = root.getBoundingClientRect();
    const start = {
      x: origin.left - box.left,
      y: origin.top - box.top + 18,
      w: Math.max(origin.width - 8, 92),
    };
    if (!flying || !to) {
      setGhost(start);
      return;
    }
    const dest = to.getBoundingClientRect();
    setGhost(start);
    const first = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setGhost({
          x: dest.left - box.left + 4,
          y: dest.top - box.top + 18,
          w: start.w,
        });
      });
    });
    return () => cancelAnimationFrame(first);
  }, [active, flying, moved]);

  const chips: Record<number, { title: string; sub: string; tone: "overdue" | "today" | "upcoming"; done?: boolean }> = {
    8: { title: "Call Maya", sub: "Rivera Homes", tone: "today" },
    12: { title: "Collect deposit", sub: "Pine Ridge", tone: "upcoming" },
    18: { title: "EST-0127", sub: "Keller Builders", tone: "upcoming" },
  };
  if (moved) {
    chips[TO_DAY] = {
      title: "INV-0046 is late",
      sub: "Northside Clean",
      tone: itemDone ? "upcoming" : "overdue",
      done: itemDone,
    };
  }

  return (
    <div ref={rootRef} className="relative flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-medium tracking-tight">Follow-ups</h3>
          <p className="text-xs text-muted-foreground">September 2026</p>
        </div>
        <p className="text-xs text-muted-foreground">{itemDone ? "3 open" : "4 open"}</p>
      </div>
      <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((day) => (
          <div key={day} className="px-1 py-2">
            {day}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-5">
        {SEP_CELLS.map((day, index) => {
          const chip = day != null ? chips[day] : null;
          const isFrom = day === FROM_DAY && !moved;
          const isTo = day === TO_DAY;
          return (
            <div
              key={index}
              ref={isFrom ? fromRef : isTo ? toRef : undefined}
              className={cn(
                "border-b border-r border-border/70 p-1.5",
                day == null && "bg-muted/15",
                isTo && lifting && "bg-primary/10",
                isTo && itemOpen && "bg-primary/5 ring-1 ring-inset ring-primary/35",
              )}
            >
              {day != null ? (
                <p className="text-[11px] tabular-nums text-muted-foreground">{day}</p>
              ) : null}
              {chip ? <FollowChip {...chip} /> : null}
              {isFrom ? (
                <FollowChip title="INV-0046 is late" sub="Northside Clean" tone="overdue" dimmed={lifting} />
              ) : null}
            </div>
          );
        })}
      </div>

      {ghost && lifting && !moved ? (
        <div
          className="landing-demo-ghost pointer-events-none absolute z-10"
          style={{
            left: ghost.x,
            top: ghost.y,
            width: ghost.w,
            transform: flying ? "scale(1.04)" : "scale(1.02)",
          }}
        >
          <FollowChip title="INV-0046 is late" sub="Northside Clean" tone="overdue" grabbing />
        </div>
      ) : null}

      {itemOpen ? (
        <FollowUpDetail reminding={reminding} sent={sent} done={itemDone} />
      ) : null}
    </div>
  );
}

function FollowUpDetail({
  reminding,
  sent,
  done,
}: {
  reminding: boolean;
  sent: boolean;
  done: boolean;
}) {
  return (
    <div className="landing-pop-in absolute top-16 right-5 z-20 w-[19.5rem] overflow-hidden rounded-xl border border-border bg-card">
      <div className="space-y-3 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn("mt-1 size-3.5 shrink-0 rounded-[3px]", done ? "bg-success" : "bg-destructive")}
            aria-hidden
          />
          <div className="min-w-0">
            <h3 className="text-sm font-medium leading-snug">INV-0046 is 4 days late</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Overdue invoice</p>
          </div>
        </div>
        <dl className="space-y-2 text-[13px]">
          <div className="flex items-start gap-2.5">
            <CalendarIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <dd className={done ? "text-muted-foreground" : "text-destructive"}>Fri, Sep 11, 2026</dd>
          </div>
          <div className="flex items-start gap-2.5">
            <LinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <dd>
              <span className="text-foreground">Invoice INV-0046</span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Northside Clean</span>
            </dd>
          </div>
        </dl>
        <p className="pl-6 text-[12px] leading-relaxed text-muted-foreground">
          Opened the pay link Sep 8. No payment yet.
        </p>
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
        {done ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
            <CheckIcon className="size-3.5" />
            Completed
          </span>
        ) : sent ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
            <CheckIcon className="size-3.5" />
            Reminder sent
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground",
              reminding && "opacity-80",
            )}
          >
            {reminding ? (
              <Loader2Icon className="size-3.5 animate-spin" />
            ) : (
              <BellRingIcon className="size-3.5" />
            )}
            Send reminder
          </span>
        )}
      </div>
    </div>
  );
}

function FollowChip({
  title,
  sub,
  tone,
  dimmed,
  grabbing,
  done,
}: {
  title: string;
  sub: string;
  tone: "overdue" | "today" | "upcoming";
  dimmed?: boolean;
  grabbing?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-1 flex min-w-0 overflow-hidden rounded-sm",
        tone === "overdue" && "bg-destructive/10",
        tone === "today" && "bg-amber-500/10",
        tone === "upcoming" && "bg-primary/10",
        dimmed && "opacity-30",
        grabbing && "bg-card ring-1 ring-border",
        done && "opacity-55",
      )}
    >
      <span
        className={cn(
          "w-0.5 shrink-0 self-stretch",
          done ? "bg-success" : tone === "overdue" ? "bg-destructive" : tone === "today" ? "bg-amber-500" : "bg-primary",
        )}
      />
      {grabbing ? (
        <GripVerticalIcon className="mt-1 ml-0.5 size-3 shrink-0 text-muted-foreground" />
      ) : null}
      <div className="min-w-0 px-1.5 py-1">
        <p className={cn("truncate text-[10px] font-medium leading-tight", done && "line-through")}>
          {title}
        </p>
        <p className="truncate text-[9px] leading-tight text-muted-foreground">{sub}</p>
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
