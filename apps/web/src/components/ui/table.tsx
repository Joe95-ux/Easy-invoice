"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const DEFAULT_STICKY_WIDTHS: [string, string] = ["4.5rem", "9rem"]

type TableProps = React.ComponentProps<"table"> & {
  /** Pin the first N columns while scrolling horizontally. Default: 2 */
  stickyColumns?: 0 | 1 | 2
  /** Widths for sticky columns 1 and 2 (CSS lengths). */
  stickyColumnWidths?: [string, string?]
}

function Table({
  className,
  stickyColumns = 2,
  stickyColumnWidths,
  style,
  ...props
}: TableProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const scrollEndTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isScrolling, setIsScrolling] = React.useState(false)

  const [width0, width1] = stickyColumnWidths ?? DEFAULT_STICKY_WIDTHS
  const stickyStyle =
    stickyColumns > 0
      ? ({
          "--table-sticky-0-width": width0,
          "--table-sticky-1-width": width1 ?? DEFAULT_STICKY_WIDTHS[1],
        } as React.CSSProperties)
      : undefined

  React.useEffect(() => {
    if (stickyColumns < 2) return

    const container = containerRef.current
    if (!container) return

    function handleScroll() {
      setIsScrolled(container!.scrollLeft > 1)
      setIsScrolling(true)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
      scrollEndTimerRef.current = setTimeout(() => setIsScrolling(false), 180)
    }

    container.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      container.removeEventListener("scroll", handleScroll)
      if (scrollEndTimerRef.current) clearTimeout(scrollEndTimerRef.current)
    }
  }, [stickyColumns])

  const showStickyEdge = isScrolled || isScrolling

  return (
    <div
      ref={containerRef}
      data-slot="table-container"
      className="group/table-container relative w-full overflow-x-auto"
      data-sticky-columns={stickyColumns > 0 ? stickyColumns : undefined}
      data-table-scrolled={showStickyEdge || undefined}
      data-table-scrolling={isScrolling || undefined}
    >
      <table
        data-slot="table"
        style={{ ...stickyStyle, ...style }}
        className={cn(
          "w-full caption-bottom [&_tr>*:first-child]:pl-5 [&_tr>*:last-child]:pr-5",
          stickyColumns >= 1 &&
            cn(
              "[&_th:nth-child(1)]:sticky [&_td:nth-child(1)]:sticky",
              "[&_th:nth-child(1)]:left-0 [&_td:nth-child(1)]:left-0",
              "[&_th:nth-child(1)]:z-20 [&_td:nth-child(1)]:z-10",
              "[&_th:nth-child(1)]:min-w-[var(--table-sticky-0-width)] [&_td:nth-child(1)]:min-w-[var(--table-sticky-0-width)]",
              "[&_th:nth-child(1)]:bg-card [&_td:nth-child(1)]:bg-card",
              "[&_tr:hover>td:nth-child(1)]:bg-muted/50",
              "[&_tr[data-state=selected]>td:nth-child(1)]:bg-muted",
            ),
          stickyColumns >= 2 &&
            cn(
              "[&_th:nth-child(2)]:sticky [&_td:nth-child(2)]:sticky",
              "[&_th:nth-child(2)]:left-[var(--table-sticky-0-width)] [&_td:nth-child(2)]:left-[var(--table-sticky-0-width)]",
              "[&_th:nth-child(2)]:z-20 [&_td:nth-child(2)]:z-10",
              "[&_th:nth-child(2)]:min-w-[var(--table-sticky-1-width)] [&_td:nth-child(2)]:min-w-[var(--table-sticky-1-width)]",
              "[&_th:nth-child(2)]:max-w-[var(--table-sticky-1-width)] [&_td:nth-child(2)]:max-w-[var(--table-sticky-1-width)]",
              "[&_td:nth-child(2)]:truncate",
              "[&_th:nth-child(2)]:bg-card [&_td:nth-child(2)]:bg-card",
              "[&_tr:hover>td:nth-child(2)]:bg-muted/50",
              "[&_tr[data-state=selected]>td:nth-child(2)]:bg-muted",
              "[&_th:nth-child(2)]:transition-[box-shadow,border-color]",
              "[&_td:nth-child(2)]:transition-[box-shadow,border-color]",
              "group-data-[table-scrolled]/table-container:[&_th:nth-child(2)]:border-r",
              "group-data-[table-scrolled]/table-container:[&_td:nth-child(2)]:border-r",
              "group-data-[table-scrolled]/table-container:[&_th:nth-child(2)]:border-border/80",
              "group-data-[table-scrolled]/table-container:[&_td:nth-child(2)]:border-border/80",
              "group-data-[table-scrolled]/table-container:[&_th:nth-child(2)]:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.12)]",
              "group-data-[table-scrolled]/table-container:[&_td:nth-child(2)]:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.12)]",
              "dark:group-data-[table-scrolled]/table-container:[&_th:nth-child(2)]:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)]",
              "dark:group-data-[table-scrolled]/table-container:[&_td:nth-child(2)]:shadow-[4px_0_10px_-4px_rgba(0,0,0,0.5)]",
              "group-data-[table-scrolling]/table-container:[&_th:nth-child(2)]:border-border",
              "group-data-[table-scrolling]/table-container:[&_td:nth-child(2)]:border-border",
              "group-data-[table-scrolling]/table-container:[&_th:nth-child(2)]:shadow-[6px_0_14px_-4px_rgba(0,0,0,0.2)]",
              "group-data-[table-scrolling]/table-container:[&_td:nth-child(2)]:shadow-[6px_0_14px_-4px_rgba(0,0,0,0.2)]",
              "dark:group-data-[table-scrolling]/table-container:[&_th:nth-child(2)]:shadow-[6px_0_14px_-4px_rgba(0,0,0,0.65)]",
              "dark:group-data-[table-scrolling]/table-container:[&_td:nth-child(2)]:shadow-[6px_0_14px_-4px_rgba(0,0,0,0.65)]",
            ),
          className,
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "h-10 px-2 text-left align-middle text-sm font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "p-2 align-middle text-sm whitespace-nowrap [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
