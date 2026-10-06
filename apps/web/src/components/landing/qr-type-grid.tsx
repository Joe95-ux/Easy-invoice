"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QR_TYPE_META } from "@/features/qr-codes/components/qr-type-meta";
import { cn } from "@/lib/utils";

/**
 * Destination grid for landing QR types — hover + idle scan so the
 * section doesn't sit still. Unauth clicks still hit Clerk sign-in.
 */
export function QrTypeGrid() {
  const [active, setActive] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % QR_TYPE_META.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const highlight = hover ?? active;

  return (
    <ul className="-m-px mt-16 grid overflow-hidden rounded-2xl border border-border sm:grid-cols-2 lg:grid-cols-4">
      {QR_TYPE_META.map((item, index) => {
        const lit = highlight === index;
        return (
          <li key={item.type} className="border border-border">
            <Link
              href={`/qr-codes/new?type=${item.type}`}
              onMouseEnter={() => setHover(index)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "relative flex h-full flex-col overflow-hidden p-5 transition-[background-color,transform] duration-300",
                lit ? "bg-muted/55" : "hover:bg-muted/40",
              )}
            >
              {lit ? (
                <span
                  aria-hidden
                  className="landing-qr-scan pointer-events-none absolute inset-x-3 top-0 h-10 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
                />
              ) : null}
              <item.icon
                className={cn(
                  "size-7 text-primary transition-transform duration-300",
                  lit && "scale-110",
                )}
                strokeWidth={1.5}
              />
              <p className="mt-4 text-sm font-semibold tracking-tight">{item.label}</p>
              <p className="mt-1 text-sm leading-snug text-muted-foreground">{item.description}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
