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

const NODES: NodeDef[] = [
  { id: "client", label: "Client", x: 72, y: 210, start: true },
  { id: "form", label: "Form", x: 250, y: 88 },
  { id: "project", label: "Project", x: 430, y: 88 },
  { id: "estimate", label: "Estimate", x: 610, y: 120 },
  { id: "time", label: "Time", x: 430, y: 210 },
  { id: "recurring", label: "Recurring", x: 430, y: 332 },
  { id: "invoice", label: "Invoice", x: 720, y: 210, hub: true },
  { id: "paid", label: "Get paid", x: 888, y: 210, end: true },
];

const EDGES: EdgeDef[] = [
  { from: "client", to: "form", bend: -36, delay: 0, duration: 3.2 },
  { from: "form", to: "project", bend: 0, delay: 0.4, duration: 2.8 },
  { from: "project", to: "estimate", bend: 18, delay: 0.8, duration: 3 },
  { from: "estimate", to: "invoice", bend: 28, delay: 1.2, duration: 2.6 },
  { from: "client", to: "time", bend: 0, delay: 0.6, duration: 3.4 },
  { from: "time", to: "invoice", bend: 0, delay: 1.1, duration: 2.9 },
  { from: "client", to: "recurring", bend: 48, delay: 0.9, duration: 3.6 },
  { from: "recurring", to: "invoice", bend: -20, delay: 1.4, duration: 2.7 },
  { from: "project", to: "time", bend: 0, delay: 1.0, duration: 3.1 },
  { from: "client", to: "invoice", bend: -70, delay: 0.2, duration: 4.2 },
  { from: "invoice", to: "paid", bend: 0, delay: 0.3, duration: 2.2 },
];

const NODE_W = 104;
const NODE_H = 40;

const MOBILE_STEPS = [
  "Client",
  "Form · Project · Estimate",
  "Time · Recurring",
  "Invoice",
  "Get paid",
] as const;

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
      viewBox="0 0 960 420"
      className="relative z-[1] hidden h-auto w-full md:block"
      role="img"
      aria-label="Flow diagram showing paths from client through forms, projects, estimates, time, and recurring into invoices and get paid"
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
        {MOBILE_STEPS.map((label, index) => {
          const isEnd = index === MOBILE_STEPS.length - 1;
          const isHub = index === MOBILE_STEPS.length - 2;
          return (
            <li key={label} className="flex justify-center">
              <span
                className={cn(
                  "relative z-[1] rounded-[10px] border px-4 py-2.5 text-center text-sm font-medium tracking-tight shadow-sm",
                  isEnd
                    ? "border-primary bg-primary text-primary-foreground"
                    : isHub
                      ? "border-primary/45 bg-card text-foreground"
                      : "border-border bg-card text-foreground",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Automation-style path map: many ways work enters Invoice Desk, all currents
 * converge on Get paid. Decorative illustration for the landing page.
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
        "money-flow relative overflow-hidden rounded-2xl border border-border/70 bg-background",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_85%_50%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden opacity-[0.35] md:block [background-image:linear-gradient(color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_20%,transparent_75%)]"
      />

      <FlowSvg gradId={gradId} glowId={glowId} reduceMotion={reduceMotion} />
      <MobileFlow reduceMotion={reduceMotion} />

      <p className="relative z-[1] border-t border-border/60 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
        Forms, projects, estimates, time, and recurring all feed invoices — then checkout
        finishes the job.
      </p>
    </div>
  );
}
