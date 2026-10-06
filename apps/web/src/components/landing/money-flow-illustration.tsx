"use client";

import { useEffect, useId, useState } from "react";
import { cn } from "@/lib/utils";

type NodeDef = {
  id: string;
  label: string;
  x: number;
  y: number;
  hub?: boolean;
  end?: boolean;
  start?: boolean;
};

type EdgeDef = {
  from: string;
  to: string;
  bend?: number;
  delay?: number;
  duration?: number;
};

/**
 * Nodes & edges mirror real Invoice Desk paths (FEATURES + app routes):
 * Client/Estimate/Project/Time/Expenses/Form/Recurring → Invoice → Get paid.
 * Forms live on projects; submissions open Create estimate — not Client→Form.
 */
const NODES: NodeDef[] = [
  { id: "client", label: "Client", x: 78, y: 210, start: true },
  { id: "project", label: "Project", x: 260, y: 96 },
  { id: "form", label: "Form", x: 430, y: 68 },
  { id: "estimate", label: "Estimate", x: 560, y: 128 },
  { id: "time", label: "Time", x: 320, y: 220 },
  { id: "expenses", label: "Expenses", x: 430, y: 300 },
  { id: "recurring", label: "Recurring", x: 560, y: 332 },
  { id: "invoice", label: "Invoice", x: 730, y: 210, hub: true },
  { id: "paid", label: "Get paid", x: 898, y: 210, end: true },
];

const EDGES: EdgeDef[] = [
  // Core SMB path — strongest visual current
  { from: "client", to: "invoice", bend: -78, delay: 0.1, duration: 4.0 },
  // Quote path
  { from: "client", to: "estimate", bend: -42, delay: 0.35, duration: 3.4 },
  { from: "estimate", to: "invoice", bend: 18, delay: 0.9, duration: 2.7 },
  // Job / project path
  { from: "client", to: "project", bend: -28, delay: 0.2, duration: 3.0 },
  { from: "project", to: "form", bend: -8, delay: 0.55, duration: 2.6 },
  { from: "form", to: "estimate", bend: 22, delay: 0.95, duration: 2.8 },
  { from: "project", to: "estimate", bend: 10, delay: 0.7, duration: 3.1 },
  { from: "project", to: "invoice", bend: -36, delay: 0.85, duration: 3.3 },
  { from: "project", to: "time", bend: 18, delay: 0.65, duration: 2.9 },
  { from: "project", to: "expenses", bend: 36, delay: 0.8, duration: 3.0 },
  // Time & expenses → invoice
  { from: "client", to: "time", bend: 8, delay: 0.45, duration: 3.2 },
  { from: "time", to: "invoice", bend: -6, delay: 1.05, duration: 2.8 },
  { from: "expenses", to: "invoice", bend: -24, delay: 1.15, duration: 2.9 },
  // Schedules keep issuing invoices
  { from: "recurring", to: "invoice", bend: -30, delay: 1.25, duration: 2.7 },
  // Terminal
  { from: "invoice", to: "paid", bend: 0, delay: 0.25, duration: 2.1 },
];

const NODE_W = 104;
const NODE_H = 40;

const MOBILE_STEPS = [
  { label: "Client", kind: "start" as const },
  { label: "Estimate · Project · Time", kind: "mid" as const },
  { label: "Form · Expenses · Recurring", kind: "mid" as const },
  { label: "Invoice", kind: "hub" as const },
  { label: "Get paid", kind: "end" as const },
];

function nodeCenter(id: string) {
  const node = NODES.find((n) => n.id === id)!;
  return { x: node.x, y: node.y };
}

function edgePath(from: string, to: string, bend = 0) {
  const a = nodeCenter(from);
  const b = nodeCenter(to);
  const dx = b.x - a.x;
  const startX = a.x + NODE_W / 2 - 4;
  const endX = b.x - NODE_W / 2 + 4;
  const c1x = startX + dx * 0.35;
  const c2x = endX - dx * 0.35;
  return `M ${startX} ${a.y} C ${c1x} ${a.y + bend}, ${c2x} ${b.y + bend}, ${endX} ${b.y}`;
}

function FlowSvg({
  gradId,
  glowId,
  reduceMotion,
}: {
  gradId: string;
  glowId: string;
  reduceMotion: boolean;
}) {
  return (
    <svg
      viewBox="0 0 980 420"
      className="relative z-[1] hidden h-auto w-full md:block"
      role="img"
      aria-label="Flow diagram of Invoice Desk: clients, estimates, projects, forms, time, expenses, and recurring all feed invoices, then get paid"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.15" />
          <stop offset="55%" stopColor="var(--primary)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.9" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {EDGES.map((edge) => (
        <path
          key={`rail-${edge.from}-${edge.to}`}
          d={edgePath(edge.from, edge.to, edge.bend)}
          className="money-flow-rail"
          fill="none"
        />
      ))}

      {!reduceMotion
        ? EDGES.map((edge) => (
            <path
              key={`current-${edge.from}-${edge.to}`}
              d={edgePath(edge.from, edge.to, edge.bend)}
              className="money-flow-current"
              fill="none"
              stroke={`url(#${gradId})`}
              filter={`url(#${glowId})`}
              style={{
                animationDelay: `${edge.delay ?? 0}s`,
                animationDuration: `${edge.duration ?? 3}s`,
              }}
            />
          ))
        : null}

      {NODES.map((node) => {
        const x = node.x - NODE_W / 2;
        const y = node.y - NODE_H / 2;
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            {node.end && !reduceMotion ? (
              <rect
                x={-4}
                y={-4}
                width={NODE_W + 8}
                height={NODE_H + 8}
                rx={12}
                className="money-flow-pulse fill-primary/15"
              />
            ) : null}
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={10}
              className={cn(
                "stroke-[1.25]",
                node.end
                  ? "fill-primary stroke-primary"
                  : node.hub
                    ? "fill-card stroke-primary/50"
                    : node.start
                      ? "fill-card stroke-foreground/25"
                      : "fill-card stroke-border",
              )}
            />
            <text
              x={NODE_W / 2}
              y={NODE_H / 2 + 4}
              textAnchor="middle"
              className={cn(
                "select-none font-medium tracking-tight",
                node.end ? "fill-primary-foreground" : "fill-foreground",
              )}
              style={{
                fontFamily: "var(--font-heading), var(--font-sans), system-ui",
                fontSize: 12,
              }}
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MobileFlow({ reduceMotion }: { reduceMotion: boolean }) {
  const reactId = useId();
  const gradId = `mf-m-grad-${reactId.replace(/:/g, "")}`;

  return (
    <div className="relative z-[1] px-5 py-8 md:hidden">
      <svg
        viewBox="0 0 40 320"
        className="pointer-events-none absolute left-1/2 top-8 h-[calc(100%-4rem)] w-10 -translate-x-1/2"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path d="M 20 8 V 312" className="money-flow-rail" fill="none" />
        {!reduceMotion ? (
          <path
            d="M 20 8 V 312"
            className="money-flow-current"
            fill="none"
            stroke={`url(#${gradId})`}
            style={{ animationDuration: "2.6s" }}
          />
        ) : null}
      </svg>

      <ol className="relative space-y-3">
        {MOBILE_STEPS.map((step) => (
          <li key={step.label} className="flex justify-center">
            <span
              className={cn(
                "relative z-[1] border px-4 py-2.5 text-center text-sm font-medium tracking-tight",
                step.kind === "end"
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.kind === "hub"
                    ? "border-primary/45 bg-card text-foreground"
                    : "border-border bg-card text-foreground",
              )}
            >
              {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Automation-style path map of real Invoice Desk routes to payment.
 */
export function MoneyFlowIllustration({ className }: { className?: string }) {
  const reactId = useId();
  const gradId = `mf-grad-${reactId.replace(/:/g, "")}`;
  const glowId = `mf-glow-${reactId.replace(/:/g, "")}`;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div
      className={cn(
        "money-flow relative overflow-hidden rounded-lg border border-border bg-background",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-[0.22] md:block [background-image:linear-gradient(color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_20%,transparent_75%)]"
      />

      <FlowSvg gradId={gradId} glowId={glowId} reduceMotion={reduceMotion} />
      <MobileFlow reduceMotion={reduceMotion} />

      <p className="relative z-[1] border-t border-border/60 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
        Quote it, track it, or schedule it — every path lands on the same invoice and pay
        link.
      </p>
    </div>
  );
}
