"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { SerializedFollowUp } from "@/lib/follow-ups/service";
import { cn } from "@/lib/utils";

const DRAG_MIME = "application/x-follow-up-id";

type CalendarUrgency = "overdue" | "today" | "upcoming";

function linkHref(item: SerializedFollowUp): string | null {
  if (item.invoiceId) return `/invoices/${item.invoiceId}`;
  if (item.estimateId) return `/estimates/${item.estimateId}`;
  if (item.clientId) return `/clients/${item.clientId}`;
  return null;
}

function linkLabel(item: SerializedFollowUp): string | null {
  if (item.invoice) return `Invoice ${item.invoice.number}`;
  if (item.estimate) return `Estimate ${item.estimate.number}`;
  if (item.client) return item.client.name;
  return null;
}

function sourceLabel(source: SerializedFollowUp["source"]): string | null {
  switch (source) {
    case "INVOICE_OVERDUE":
      return "Overdue invoice";
    case "INVOICE_DUE_SOON":
      return "Due soon";
    case "ESTIMATE_EXPIRING":
      return "Expiring estimate";
    default:
      return null;
  }
}

function assigneeLabel(item: SerializedFollowUp): string | null {
  if (!item.member) return null;
  return item.member.name?.trim() || item.member.email;
}

function calendarUrgency(dueDate: string | null): CalendarUrgency {
  const todayKey = format(new Date(), "yyyy-MM-dd");
  if (!dueDate || dueDate > todayKey) return "upcoming";
  if (dueDate === todayKey) return "today";
  return "overdue";
}

function calendarBandClass(urgency: CalendarUrgency) {
  switch (urgency) {
    case "overdue":
      return "bg-destructive";
    case "today":
      return "bg-amber-500";
    default:
      return "bg-primary";
  }
}

function calendarChipSurface(urgency: CalendarUrgency) {
  switch (urgency) {
    case "overdue":
      return "bg-destructive/10 hover:bg-destructive/15";
    case "today":
      return "bg-amber-500/10 hover:bg-amber-500/15";
    default:
      return "bg-primary/10 hover:bg-primary/15";
  }
}

function calendarMeta(item: SerializedFollowUp): string | null {
  const parts = [
    linkLabel(item),
    item.client && (item.invoiceId || item.estimateId) ? item.client.name : null,
    sourceLabel(item.source),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function dueToneClass(dueDate: string | null) {
  const urgency = calendarUrgency(dueDate);
  if (urgency === "overdue") return "text-destructive";
  if (urgency === "today") return "text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

type FollowUpCalendarProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  selectedDay: Date;
  onSelectedDayChange: (day: Date) => void;
  itemsByDay: Map<string, SerializedFollowUp[]>;
  isMobile: boolean;
  busyId: string | null;
  canWrite?: boolean;
  onToggle: (item: SerializedFollowUp) => void;
  onEdit: (item: SerializedFollowUp) => void;
  onDelete: (item: SerializedFollowUp) => void;
  onReschedule: (item: SerializedFollowUp, dueDate: string) => void;
  renderDayListItem: (item: SerializedFollowUp) => ReactNode;
};

export function FollowUpCalendar({
  month,
  onMonthChange,
  selectedDay,
  onSelectedDayChange,
  itemsByDay,
  isMobile,
  busyId,
  canWrite = true,
  onToggle,
  onEdit,
  onDelete,
  onReschedule,
  renderDayListItem,
}: FollowUpCalendarProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropDayKey, setDropDayKey] = useState<string | null>(null);
  const dragMovedRef = useRef(false);

  const calendarDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month)),
  });

  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayItems = itemsByDay.get(selectedDayKey) ?? [];

  function closePopover() {
    setOpenId(null);
  }

  function handleDragStart(event: DragEvent, item: SerializedFollowUp) {
    if (!canWrite) {
      event.preventDefault();
      return;
    }
    dragMovedRef.current = true;
    event.dataTransfer.setData(DRAG_MIME, item.id);
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(item.id);
    setOpenId(null);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropDayKey(null);
    // Keep dragMovedRef true until the following click/open attempt clears it.
    window.setTimeout(() => {
      dragMovedRef.current = false;
    }, 0);
  }

  function handleChipOpen(item: SerializedFollowUp, day: Date, nextOpen: boolean) {
    if (dragMovedRef.current) {
      dragMovedRef.current = false;
      if (nextOpen) {
        setOpenId(null);
        return;
      }
    }
    onSelectedDayChange(day);
    setOpenId(nextOpen ? item.id : null);
  }

  function handleDayDragOver(event: DragEvent, dayKey: string) {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropDayKey !== dayKey) setDropDayKey(dayKey);
  }

  function handleDayDrop(event: DragEvent, day: Date, dayKey: string) {
    event.preventDefault();
    if (!canWrite) return;
    const id = event.dataTransfer.getData(DRAG_MIME) || event.dataTransfer.getData("text/plain");
    setDropDayKey(null);
    setDraggingId(null);
    if (!id) return;

    const dayItems = itemsByDay.get(dayKey) ?? [];
    const fromOtherDay = [...itemsByDay.values()].flat().find((entry) => entry.id === id);
    const item = fromOtherDay ?? dayItems.find((entry) => entry.id === id);
    if (!item || item.dueDate === dayKey) return;

    onSelectedDayChange(day);
    onReschedule(item, dayKey);
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3 sm:px-4">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(subMonths(month, 1))}
              aria-label="Previous month"
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <h2 className="text-sm font-medium sm:text-base">{format(month, "MMMM yyyy")}</h2>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onMonthChange(addMonths(month, 1))}
              aria-label="Next month"
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[36rem] sm:min-w-0">
              <div className="grid grid-cols-7 border-b border-border bg-muted/30 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[11px]">
                {(isMobile
                  ? ["S", "M", "T", "W", "T", "F", "S"]
                  : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                ).map((day, index) => (
                  <div key={`${day}-${index}`} className="px-1 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7" role="grid" aria-label="Follow-ups calendar">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayItems = itemsByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, month);
                  const selected = isSameDay(day, selectedDay);
                  const isDropTarget = dropDayKey === key && Boolean(draggingId);
                  const maxVisible = isMobile ? 2 : 3;
                  const visibleItems = dayItems.slice(0, maxVisible);
                  const hiddenCount = dayItems.length - visibleItems.length;

                  return (
                    <div
                      key={key}
                      role="gridcell"
                      tabIndex={0}
                      aria-selected={selected}
                      aria-label={format(day, "EEEE, MMMM d")}
                      onClick={() => onSelectedDayChange(day)}
                      onKeyDown={(event: KeyboardEvent) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectedDayChange(day);
                        }
                      }}
                      onDragOver={(event) => handleDayDragOver(event, key)}
                      onDragLeave={() => {
                        if (dropDayKey === key) setDropDayKey(null);
                      }}
                      onDrop={(event) => handleDayDrop(event, day, key)}
                      className={cn(
                        "flex min-h-[5.5rem] cursor-pointer flex-col gap-0.5 border-b border-r border-border p-1 text-left transition-colors sm:min-h-[7.5rem] sm:gap-1 sm:p-1.5",
                        "hover:bg-muted/40 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        !inMonth && "bg-muted/20 text-muted-foreground",
                        selected && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                        isDropTarget && "bg-primary/10 ring-2 ring-inset ring-primary/50",
                      )}
                    >
                      <span
                        className={cn(
                          "mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums sm:size-7 sm:text-[13px]",
                          isToday(day) && "bg-primary font-medium text-primary-foreground",
                          !inMonth && !isToday(day) && "text-muted-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>

                      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
                        {visibleItems.map((item) => (
                          <CalendarEventChip
                            key={item.id}
                            item={item}
                            compact={isMobile}
                            open={openId === item.id}
                            dragging={draggingId === item.id}
                            busy={busyId === item.id}
                            canWrite={canWrite}
                            onOpenChange={(next) => handleChipOpen(item, day, next)}
                            onToggle={() => {
                              closePopover();
                              onToggle(item);
                            }}
                            onEdit={() => {
                              closePopover();
                              onEdit(item);
                            }}
                            onDelete={() => {
                              closePopover();
                              onDelete(item);
                            }}
                            onDragStart={(event) => handleDragStart(event, item)}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                        {hiddenCount > 0 ? (
                          <span className="truncate px-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                            +{hiddenCount} more
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-destructive" aria-hidden />
              Overdue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-amber-500" aria-hidden />
              Due today
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-sm bg-primary" aria-hidden />
              Upcoming
            </span>
            <span className="text-muted-foreground/80">
              {canWrite ? "Drag items to reschedule" : "View-only calendar"}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 px-2">
            <h2 className="text-sm font-medium">{format(selectedDay, "EEEE, MMM d")}</h2>
            {selectedDayItems.length > 0 ? (
              <span className="text-xs text-muted-foreground">{selectedDayItems.length} open</span>
            ) : null}
          </div>
          {selectedDayItems.length === 0 ? (
            <p className="px-2 py-6 text-sm text-muted-foreground">
              No open follow-ups on this day. Pick another day or add one.
            </p>
          ) : (
            selectedDayItems.map((item) => renderDayListItem(item))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CalendarEventChip({
  item,
  compact,
  open,
  dragging,
  busy,
  canWrite,
  onOpenChange,
  onToggle,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}: {
  item: SerializedFollowUp;
  compact?: boolean;
  open: boolean;
  dragging: boolean;
  busy: boolean;
  canWrite: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
}) {
  const urgency = calendarUrgency(item.dueDate);
  const meta = calendarMeta(item);

  return (
    <div
      draggable={canWrite}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "group/chip flex w-full min-w-0 overflow-hidden rounded-sm transition-colors",
        canWrite ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        calendarChipSurface(urgency),
        dragging && "opacity-40",
      )}
    >
      <span
        className={cn("w-0.5 shrink-0 self-stretch sm:w-1", calendarBandClass(urgency))}
        aria-hidden
      />
      {canWrite ? (
        <button
          type="button"
          aria-label="Mark as complete"
          disabled={busy}
          draggable={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggle();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className={cn(
            "m-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full border border-foreground/35 bg-background/90 text-foreground",
            "opacity-100 transition-opacity sm:opacity-0 sm:group-hover/chip:opacity-100 sm:group-focus-within/chip:opacity-100",
            "hover:border-foreground/60 hover:bg-background disabled:pointer-events-none disabled:opacity-50",
          )}
        >
          <CheckIcon className="size-2.5 opacity-0 group-hover/chip:opacity-50" aria-hidden />
        </button>
      ) : (
        <span className="m-0.5 size-3.5 shrink-0" aria-hidden />
      )}

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger
          className={cn(
            "min-w-0 flex-1 rounded-none bg-transparent py-0.5 pr-1 text-left outline-none",
            canWrite ? "cursor-grab" : "cursor-pointer",
            "focus-visible:ring-0",
          )}
          title={[item.title, meta].filter(Boolean).join(" — ")}
        >
          <span className={cn("block", compact ? "space-y-0" : "space-y-0.5")}>
            <span className="block truncate text-[10px] font-medium leading-tight text-foreground sm:text-[11px]">
              {item.title}
            </span>
            {!compact && meta ? (
              <span className="hidden truncate text-[10px] leading-tight text-muted-foreground sm:block">
                {meta}
              </span>
            ) : null}
          </span>
        </PopoverTrigger>

        <PopoverContent
          side={compact ? "bottom" : "right"}
          align="start"
          sideOffset={8}
          className={cn(
            "w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0",
            "duration-200 ease-out data-open:fade-in-0 data-open:zoom-in-95",
            "data-closed:duration-150 data-closed:fade-out-0 data-closed:zoom-out-95",
          )}
          onClick={(event) => event.stopPropagation()}
        >
          <CalendarEventPopover
            item={item}
            busy={busy}
            canWrite={canWrite}
            onClose={() => onOpenChange(false)}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggle={onToggle}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CalendarEventPopover({
  item,
  busy,
  canWrite,
  onClose,
  onEdit,
  onDelete,
  onToggle,
}: {
  item: SerializedFollowUp;
  busy: boolean;
  canWrite: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const urgency = calendarUrgency(item.dueDate);
  const href = linkHref(item);
  const label = linkLabel(item);
  const source = sourceLabel(item.source);
  const assignee = assigneeLabel(item);
  const showClientBesideDoc = Boolean(item.client) && Boolean(item.invoiceId || item.estimateId);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-end gap-0.5 border-b border-border/60 px-1.5 py-1">
        {canWrite ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={onEdit}
              aria-label="Edit follow-up"
            >
              <PencilIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={busy}
              onClick={onDelete}
              aria-label="Delete follow-up"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClose}
          aria-label="Close"
        >
          <XIcon className="size-4" />
        </Button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex items-start gap-2.5">
          <span
            className={cn("mt-1 size-3.5 shrink-0 rounded-[3px]", calendarBandClass(urgency))}
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-medium leading-snug text-foreground">{item.title}</h3>
            {source ? <p className="mt-1 text-xs text-muted-foreground">{source}</p> : null}
          </div>
        </div>

        <dl className="space-y-2.5 text-sm">
          {item.dueDate ? (
            <div className="flex items-start gap-2.5">
              <CalendarIcon
                className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0">
                <dt className="sr-only">Due</dt>
                <dd className={cn(dueToneClass(item.dueDate))}>
                  {format(parseISO(item.dueDate), "EEE, MMM d, yyyy")}
                </dd>
              </div>
            </div>
          ) : null}
          <div className="flex items-start gap-2.5">
            <UserIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <dt className="sr-only">Assignee</dt>
              <dd className="text-foreground">{assignee ?? "Unassigned"}</dd>
            </div>
          </div>
          {href && label ? (
            <div className="flex items-start gap-2.5">
              <LinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Linked</dt>
                <dd className="min-w-0">
                  <Link href={href} className="text-primary hover:underline" onClick={onClose}>
                    {label}
                  </Link>
                  {showClientBesideDoc ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {item.client!.name}
                    </span>
                  ) : null}
                </dd>
              </div>
            </div>
          ) : item.client ? (
            <div className="flex items-start gap-2.5">
              <LinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0">
                <dt className="sr-only">Client</dt>
                <dd className="text-foreground">{item.client.name}</dd>
              </div>
            </div>
          ) : null}
        </dl>

        {item.notes ? (
          <p className="whitespace-pre-wrap pl-6 text-sm text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>

      {canWrite ? (
        <div className="flex justify-end border-t border-border/60 px-3 py-2.5">
          <Button type="button" size="sm" disabled={busy} onClick={onToggle}>
            Mark as complete
          </Button>
        </div>
      ) : null}
    </div>
  );
}
