"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpIcon,
  CheckIcon,
  Loader2Icon,
  MicIcon,
  PlusIcon,
  SparklesIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NOTE =
  "enlevé le carrelage 2 salles de bain 300$ chacune, posé du placo 600, peinture 420. remise 10% si payé cette semaine.";

const LINES = [
  { label: "Tile removal — 2 bathrooms", qty: "2 × $300.00", amount: "$600.00" },
  { label: "Drywall installation", qty: "1 × $600.00", amount: "$600.00" },
  { label: "Painting", qty: "1 × $420.00", amount: "$420.00" },
] as const;

const EXAMPLES = ["Bathroom remodel", "Monthly lawn care", "Website project"] as const;

type Phase = "typing" | "thinking" | "invoice" | "hold";

/**
 * Realistic create-invoice AI composer that types a job, then morphs
 * into a compact invoice. Shell height follows the visible panel.
 */
export function AiDraftLive() {
  const ref = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("typing");
  const [levels, setLevels] = useState([0.3, 0.55, 0.4, 0.7, 0.35]);
  const [shellHeight, setShellHeight] = useState<number>();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry?.isIntersecting ?? false),
      { threshold: 0.28 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setTyped(NOTE.length);
      setPhase("hold");
      return;
    }
    if (!inView) return;

    let timer: ReturnType<typeof setTimeout>;
    if (phase === "typing") {
      timer =
        typed < NOTE.length
          ? setTimeout(() => setTyped((n) => n + 1), typed === 0 ? 480 : 20)
          : setTimeout(() => setPhase("thinking"), 500);
    } else if (phase === "thinking") {
      timer = setTimeout(() => setPhase("invoice"), 1100);
    } else if (phase === "invoice") {
      timer = setTimeout(() => setPhase("hold"), 400);
    } else {
      timer = setTimeout(() => {
        setTyped(0);
        setPhase("typing");
      }, 3800);
    }
    return () => clearTimeout(timer);
  }, [inView, reduced, phase, typed]);

  useEffect(() => {
    if (reduced || !inView || phase !== "typing") return;
    const id = window.setInterval(() => {
      setLevels(Array.from({ length: 5 }, () => 0.2 + Math.random() * 0.8));
    }, 90);
    return () => window.clearInterval(id);
  }, [inView, reduced, phase]);

  const typing = phase === "typing";
  const thinking = phase === "thinking";
  const showInvoice = phase === "invoice" || phase === "hold";
  const canSubmit = typed > 12 && !thinking;

  useLayoutEffect(() => {
    const panel = showInvoice ? invoiceRef.current : composerRef.current;
    if (!panel) return;
    setShellHeight(panel.offsetHeight);
  }, [showInvoice, typed, thinking, reduced]);

  return (
    <div ref={ref} className="landing-hero-frame rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <SparklesIcon className="size-3.5" />
          </span>
          <p className="text-xs font-medium">
            {showInvoice ? "INV-0043" : "New invoice"}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            showInvoice
              ? "bg-success/12 text-success"
              : thinking
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          {showInvoice ? <CheckIcon className="size-3" /> : null}
          {thinking ? <Loader2Icon className="size-3 animate-spin" /> : null}
          {showInvoice ? "Ready to send" : thinking ? "Structuring" : "Listening"}
        </span>
      </div>

      <div
        className={cn(
          "relative overflow-hidden",
          !reduced &&
            "transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
        style={shellHeight ? { height: shellHeight } : undefined}
      >
        <div
          ref={composerRef}
          className={cn(
            "flex w-full flex-col p-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            showInvoice
              ? "pointer-events-none absolute inset-x-0 top-0 opacity-0"
              : "relative opacity-100",
          )}
        >
          <h3 className="mb-3 text-sm font-semibold tracking-tight">Describe the job</h3>

          <div
            className={cn(
              "flex flex-col rounded-2xl border bg-input/30 transition-[color,box-shadow,border-color]",
              typing
                ? "border-primary/50 ring-3 ring-primary/20"
                : thinking
                  ? "border-ring ring-3 ring-ring/40"
                  : "border-input",
            )}
          >
            <p className="min-h-32 px-4 pt-4 pb-2 text-[13px] leading-relaxed">
              {NOTE.slice(0, typed)}
              {typing ? (
                <span
                  aria-hidden
                  className="landing-caret ml-px inline-block h-[1.05em] w-px translate-y-px bg-foreground"
                />
              ) : null}
            </p>
            <div className="flex items-center justify-between gap-3 px-3 pb-3 pt-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex size-8 items-center justify-center rounded-[10px] text-muted-foreground">
                  <PlusIcon className="size-4" />
                </span>
                {typing ? (
                  <>
                    <span className="flex h-5 items-end gap-0.5" aria-hidden>
                      {levels.map((level, index) => (
                        <span
                          key={index}
                          className="w-0.5 rounded-full bg-primary"
                          style={{ height: `${Math.max(4, Math.round(level * 20))}px` }}
                        />
                      ))}
                    </span>
                    <span className="truncate text-xs font-medium text-primary">Listening…</span>
                  </>
                ) : null}
                {thinking ? (
                  <span className="text-xs text-muted-foreground">Reading notes…</span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-[10px]",
                    typing ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  <MicIcon className="size-4" />
                </span>
                <span
                  className={cn(
                    "inline-flex size-9 shrink-0 items-center justify-center rounded-[10px]",
                    canSubmit || thinking
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {thinking ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <ArrowUpIcon className="size-4" />
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Try:</span>
            {EXAMPLES.map((example) => (
              <span
                key={example}
                className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground"
              >
                {example}
              </span>
            ))}
          </div>
        </div>

        <div
          ref={invoiceRef}
          className={cn(
            "flex w-full flex-col px-5 py-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            showInvoice
              ? "relative opacity-100"
              : "pointer-events-none absolute inset-x-0 top-0 translate-y-1 opacity-0",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                From
              </p>
              <p className="mt-0.5 text-sm font-semibold">Acme Trades</p>
              <p className="text-[11px] text-muted-foreground">12 Harbor Rd · Portland</p>
            </div>
            <div className="text-right">
              <p className="font-heading text-lg font-semibold tracking-tight">INV-0043</p>
              <p className="text-[11px] text-muted-foreground">Due Sep 12, 2026</p>
            </div>
          </div>

          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Bill to
            </p>
            <p className="mt-0.5 text-sm font-medium">Rivera Homes</p>
            <p className="text-[11px] text-muted-foreground">Bathroom remodel</p>
          </div>

          <table className="mt-4 w-full text-left text-[12px]">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="pb-1.5 font-medium">Item</th>
                <th className="pb-1.5 text-right font-medium">Qty</th>
                <th className="pb-1.5 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {LINES.map((line) => (
                <tr key={line.label} className="border-b border-border/70">
                  <td className="py-2 pr-3 font-medium">{line.label}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">{line.qty}</td>
                  <td className="py-2 text-right tabular-nums">{line.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 ml-auto w-44 space-y-1.5 text-[12px]">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">$1,620.00</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Discount 10%</span>
              <span className="tabular-nums">−$162.00</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>Total due</span>
              <span className="tabular-nums">$1,458.00</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end">
            <span className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
              Send invoice
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
