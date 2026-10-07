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
 * Client / Estimate / Project / Time / Expenses / Form / Recurring → Invoice → Get paid.
 * Forms live on projects; submissions open Create estimate — not Client→Form.
 * Recurring issues invoices on a schedule; it is not a step after Client.
 */
const EDGES: EdgeDef[] = [
  { from: "client", to: "invoice", bend: -78, delay: 0.1, duration: 4.0 },
  { from: "client", to: "estimate", bend: -42, delay: 0.35, duration: 3.4 },
  { from: "estimate", to: "invoice", bend: 18, delay: 0.9, duration: 2.7 },
  { from: "client", to: "project", bend: -28, delay: 0.2, duration: 3.0 },
  { from: "project", to: "form", bend: -8, delay: 0.55, duration: 2.6 },
  { from: "form", to: "estimate", bend: 22, delay: 0.95, duration: 2.8 },
  { from: "project", to: "estimate", bend: 10, delay: 0.7, duration: 3.1 },
  { from: "project", to: "invoice", bend: -36, delay: 0.85, duration: 3.3 },
  { from: "project", to: "time", bend: 18, delay: 0.65, duration: 2.9 },
  { from: "project", to: "expenses", bend: 36, delay: 0.8, duration: 3.0 },
  { from: "client", to: "time", bend: 8, delay: 0.45, duration: 3.2 },
  { from: "time", to: "invoice", bend: -6, delay: 1.05, duration: 2.8 },
  { from: "expenses", to: "invoice", bend: -24, delay: 1.15, duration: 2.9 },
  { from: "recurring", to: "invoice", bend: -30, delay: 1.25, duration: 2.7 },
  { from: "invoice", to: "paid", bend: 0, delay: 0.25, duration: 2.1 },
];

const DESKTOP_NODES: NodeDef[] = [
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

/** Same graph, stacked so it stays readable on a narrow screen. */
const MOBILE_NODES: NodeDef[] = [
  { id: "client", label: "Client", x: 180, y: 40, start: true },
  { id: "project", label: "Project", x: 70, y: 132 },
  { id: "estimate", label: "Estimate", x: 180, y: 132 },
  { id: "time", label: "Time", x: 290, y: 132 },
  { id: "form", label: "Form", x: 70, y: 224 },
  { id: "expenses", label: "Expenses", x: 180, y: 224 },
  { id: "recurring", label: "Recurring", x: 290, y: 224 },
  { id: "invoice", label: "Invoice", x: 180, y: 336, hub: true },
  { id: "paid", label: "Get paid", x: 180, y: 428, end: true },
];

function nodeById(nodes: NodeDef[], id: string) {
  const node = nodes.find((n) => n.id === id);
  if (!node) throw new Error(`Unknown flow node: ${id}`);
  return node;
}

/** Left-to-right connectors for the wide desktop map. */
function desktopEdgePath(nodes: NodeDef[], from: string, to: string, nodeW: number, bend = 0) {
  const a = nodeById(nodes, from);
  const b = nodeById(nodes, to);
  const dx = b.x - a.x;
  const startX = a.x + nodeW / 2 - 4;
  const endX = b.x - nodeW / 2 + 4;
  const c1x = startX + dx * 0.35;
  const c2x = endX - dx * 0.35;
  return `M ${startX} ${a.y} C ${c1x} ${a.y + bend}, ${c2x} ${b.y + bend}, ${endX} ${b.y}`;
}

/** Point-to-point connectors for the stacked mobile map. */
function stackedEdgePath(nodes: NodeDef[], from: string, to: string, nodeW: number, nodeH: number, bend = 0) {
  const a = nodeById(nodes, from);
  const b = nodeById(nodes, to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const startX = a.x + ux * (nodeW / 2 - 8);
  const startY = a.y + uy * (nodeH / 2 - 4);
  const endX = b.x - ux * (nodeW / 2 - 8);
  const endY = b.y - uy * (nodeH / 2 - 4);
  const px = -uy;
  const py = ux;
  const offset = bend * 0.22;
  const c1x = startX + dx * 0.35 + px * offset;
  const c1y = startY + dy * 0.35 + py * offset;
  const c2x = endX - dx * 0.35 + px * offset;
  const c2y = endY - dy * 0.35 + py * offset;
  return `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`;
}

function FlowSvg({
  nodes,
  viewBox,
  nodeW,
  nodeH,
  layout,
  className,
  gradId,
  glowId,
  reduceMotion,
}: {
  nodes: NodeDef[];
  viewBox: string;
  nodeW: number;
  nodeH: number;
  layout: "desktop" | "mobile";
  className?: string;
  gradId: string;
  glowId: string;
  reduceMotion: boolean;
}) {
  const pathFor = (from: string, to: string, bend = 0) =>
    layout === "desktop"
      ? desktopEdgePath(nodes, from, to, nodeW, bend)
      : stackedEdgePath(nodes, from, to, nodeW, nodeH, bend);

  return (
    <svg
      viewBox={viewBox}
      className={className}
      role="img"
      aria-label="Flow diagram of Invoice Desk: clients, estimates, projects, forms, time, expenses, and recurring all feed invoices, then get paid"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="0%"
          y1="0%"
          x2={layout === "desktop" ? "100%" : "0%"}
          y2={layout === "desktop" ? "0%" : "100%"}
        >
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
          d={pathFor(edge.from, edge.to, edge.bend)}
          className="money-flow-rail"
          fill="none"
        />
      ))}

      {!reduceMotion
        ? EDGES.map((edge) => (
            <path
              key={`current-${edge.from}-${edge.to}`}
              d={pathFor(edge.from, edge.to, edge.bend)}
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

      {nodes.map((node) => {
        const x = node.x - nodeW / 2;
        const y = node.y - nodeH / 2;
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            {node.end && !reduceMotion ? (
              <rect
                x={-4}
                y={-4}
                width={nodeW + 8}
                height={nodeH + 8}
                rx={12}
                className="money-flow-pulse fill-primary/15"
              />
            ) : null}
            <rect
              width={nodeW}
              height={nodeH}
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
              x={nodeW / 2}
              y={nodeH / 2 + 4}
              textAnchor="middle"
              className={cn(
                "select-none font-medium tracking-tight",
                node.end ? "fill-primary-foreground" : "fill-foreground",
              )}
              style={{
                fontFamily: "var(--font-heading), var(--font-sans), system-ui",
                fontSize: layout === "mobile" ? 11 : 12,
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

/**
 * Automation-style path map of real Invoice Desk routes to payment.
 */
export function MoneyFlowIllustration({ className }: { className?: string }) {
  const reactId = useId();
  const id = reactId.replace(/:/g, "");
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
        className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklch,var(--border)_70%,transparent)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_65%_at_50%_50%,#000_20%,transparent_75%)]"
      />

      <FlowSvg
        nodes={DESKTOP_NODES}
        viewBox="0 0 980 420"
        nodeW={104}
        nodeH={40}
        layout="desktop"
        className="relative z-[1] hidden h-auto w-full md:block"
        gradId={`mf-grad-${id}`}
        glowId={`mf-glow-${id}`}
        reduceMotion={reduceMotion}
      />
      <FlowSvg
        nodes={MOBILE_NODES}
        viewBox="0 0 360 468"
        nodeW={96}
        nodeH={36}
        layout="mobile"
        className="relative z-[1] h-auto w-full md:hidden"
        gradId={`mf-m-grad-${id}`}
        glowId={`mf-m-glow-${id}`}
        reduceMotion={reduceMotion}
      />

      <p className="relative z-[1] border-t border-border/60 px-5 py-3 text-center text-xs text-muted-foreground sm:px-6">
        Quote it, track it, or schedule it — every path lands on the same invoice and pay
        link.
      </p>
    </div>
  );
}
