"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type HeroDepthProps = {
  children: React.ReactNode;
  className?: string;
  /** Max lag in px as the hero leaves the viewport. */
  maxShift?: number;
};

/**
 * Hero product frame lags behind page scroll. Overflow stays clipped
 * so the shift cannot extend the document past the footer.
 */
export function HeroDepth({ children, className, maxShift = 28 }: HeroDepthProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const travel = Math.max(1, rect.height + viewport * 0.25);
      const progress = Math.min(1, Math.max(0, -rect.top / travel));
      node.style.transform = `translate3d(0, ${progress * maxShift}px, 0)`;
    };

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, [maxShift]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}

/** Scroll-linked background drift on the landing canvas. Does not transform layout. */
export function LandingParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const update = () => {
      const y = window.scrollY;
      node.style.setProperty("--landing-parallax", `${y * 0.12}px`);
      node.style.setProperty("--landing-parallax-slow", `${y * 0.05}px`);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  return (
    <main ref={ref} className="landing-canvas">
      {children}
    </main>
  );
}
