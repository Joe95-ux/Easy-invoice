"use client";

import { useMemo, useRef, useState } from "react";
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
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GripVerticalIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FollowUpDialog,
  type FollowUpLinkOption,
} from "@/features/follow-ups/components/follow-up-dialog";
import type { SerializedFollowUp } from "@/lib/follow-ups/service";
import { cn } from "@/lib/utils";

type FollowUpsPageContentProps = {
  initialFollowUps: SerializedFollowUp[];
  clients: FollowUpLinkOption[];
  invoices: FollowUpLinkOption[];
  estimates: FollowUpLinkOption[];
};

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
      return "Overdue";
    case "INVOICE_DUE_SOON":
      return "Due soon";
    case "ESTIMATE_EXPIRING":
      return "Expiring";
    default:
      return null;
  }
}

function dueTone(dueDate: string | null, status: SerializedFollowUp["status"]) {
  if (!dueDate || status === "DONE") return "text-muted-foreground";
  const todayKey = format(new Date(), "yyyy-MM-dd");
  if (dueDate < todayKey) return "text-destructive";
  if (dueDate === todayKey) return "text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

export function FollowUpsPageContent({
  initialFollowUps,
  clients,
  invoices,
  estimates,
}: FollowUpsPageContentProps) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const openItemsRef = useRef<SerializedFollowUp[]>([]);
  const dragIdRef = useRef<string | null>(null);
  const orderDirtyRef = useRef(false);

  const openItems = useMemo(
    () => followUps.filter((item) => item.status === "OPEN"),
    [followUps],
  );
  const doneItems = useMemo(
    () =>
      followUps
        .filter((item) => item.status === "DONE")
        .sort((a, b) =>
          (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
        ),
    [followUps],
  );
  const visibleDoneItems = doneItems.slice(0, 40);

  openItemsRef.current = openItems;

  const itemsByDay = useMemo(() => {
    const map = new Map<string, SerializedFollowUp[]>();
    for (const item of followUps) {
      if (!item.dueDate || item.status === "DONE") continue;
      const list = map.get(item.dueDate) ?? [];
      list.push(item);
      map.set(item.dueDate, list);
    }
    return map;
  }, [followUps]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayItems = itemsByDay.get(selectedDayKey) ?? [];

  async function patchFollowUp(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/follow-ups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      const updated = data.followUp as SerializedFollowUp;
      setFollowUps((prev) => {
        const next = prev.map((item) => (item.id === id ? updated : item));
        const open = next
          .filter((item) => item.status === "OPEN")
          .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
        const done = next
          .filter((item) => item.status === "DONE")
          .sort((a, b) =>
            (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
          );
        return [...open, ...done];
      });
      return updated;
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggle(item: SerializedFollowUp) {
    const nextStatus = item.status === "OPEN" ? "DONE" : "OPEN";
    try {
      await patchFollowUp(item.id, { status: nextStatus });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update follow-up");
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/follow-ups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setFollowUps((prev) => prev.filter((item) => item.id !== id));
      toast.success("Follow-up removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete follow-up");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/follow-ups/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setFollowUps(data.followUps as SerializedFollowUp[]);
      const parts = [
        data.created ? `${data.created} new` : null,
        data.resolved ? `${data.resolved} resolved` : null,
      ].filter(Boolean);
      toast.success(
        parts.length ? `Suggestions updated (${parts.join(", ")})` : "Suggestions are up to date",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sync suggestions");
    } finally {
      setSyncing(false);
    }
  }

  async function persistOrder(nextOpen: SerializedFollowUp[]) {
    let previous: SerializedFollowUp[] = [];
    setFollowUps((prev) => {
      previous = prev;
      const done = prev.filter((item) => item.status === "DONE");
      return [...nextOpen, ...done];
    });
    try {
      const res = await fetch("/api/follow-ups/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: nextOpen.map((item) => item.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Reorder failed");
      setFollowUps(data.followUps as SerializedFollowUp[]);
    } catch (error) {
      setFollowUps(previous);
      toast.error(error instanceof Error ? error.message : "Could not reorder");
    }
  }

  function onDragStart(event: React.DragEvent, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    dragIdRef.current = id;
    orderDirtyRef.current = false;
    setDragId(id);
  }

  function onDragOver(event: React.DragEvent, overId: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const activeId = dragIdRef.current;
    if (!activeId || activeId === overId) return;

    const current = openItemsRef.current;
    const from = current.findIndex((item) => item.id === activeId);
    const to = current.findIndex((item) => item.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    orderDirtyRef.current = true;
    openItemsRef.current = next;
    setFollowUps((prev) => [...next, ...prev.filter((item) => item.status === "DONE")]);
  }

  function onDragEnd() {
    const activeId = dragIdRef.current;
    dragIdRef.current = null;
    setDragId(null);
    if (!activeId || !orderDirtyRef.current) return;
    orderDirtyRef.current = false;
    void persistOrder(openItemsRef.current);
  }

  function renderRow(item: SerializedFollowUp, draggable: boolean) {
    const href = linkHref(item);
    const label = linkLabel(item);
    const source = sourceLabel(item.source);
    const busy = busyId === item.id;
    const showClientBesideDoc =
      Boolean(item.client) && Boolean(item.invoiceId || item.estimateId);

    return (
      <div
        key={item.id}
        onDragOver={(event) => draggable && onDragOver(event, item.id)}
        className={cn(
          "group flex items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors hover:border-border hover:bg-muted/40",
          dragId === item.id && "border-border bg-muted/60 opacity-80",
          item.status === "DONE" && "opacity-70",
        )}
      >
        {draggable ? (
          <button
            type="button"
            draggable
            onClick={(event) => event.preventDefault()}
            onDragStart={(event) => onDragStart(event, item.id)}
            onDragEnd={onDragEnd}
            className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        ) : (
          <span className="mt-0.5 size-4 shrink-0" />
        )}

        <Checkbox
          checked={item.status === "DONE"}
          disabled={busy}
          onCheckedChange={() => void handleToggle(item)}
          className="mt-0.5"
          aria-label={item.status === "DONE" ? "Mark open" : "Mark done"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                item.status === "DONE" && "text-muted-foreground line-through",
              )}
            >
              {item.title}
            </p>
            {source ? (
              <Badge variant="secondary" className="font-normal">
                {source}
              </Badge>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {item.dueDate ? (
              <span className={dueTone(item.dueDate, item.status)}>
                Due {format(parseISO(item.dueDate), "MMM d, yyyy")}
              </span>
            ) : (
              <span className="text-muted-foreground">No due date</span>
            )}
            {href && label ? (
              <Link href={href} className="text-primary hover:underline">
                {label}
              </Link>
            ) : null}
            {showClientBesideDoc ? (
              <span className="text-muted-foreground">{item.client!.name}</span>
            ) : null}
          </div>
          {item.notes ? (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
          disabled={busy}
          onClick={() => void handleDelete(item.id)}
          aria-label="Delete follow-up"
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Checklist and calendar for invoice and estimate follow-through."
        actions={
          <div className={cn("flex flex-wrap gap-2", pageHeaderActionClass)}>
            <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
              {syncing ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Sync suggestions
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <PlusIcon className="size-4" />
              Add follow-up
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="list" className="gap-4">
        <TabsList variant="segment">
          <TabsTrigger value="list">Checklist</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          {openItems.length === 0 && doneItems.length === 0 ? (
            <EmptyState
              icon={CheckSquareIcon}
              title="No follow-ups yet"
              description="Add a manual follow-up, or sync suggestions from overdue invoices and expiring estimates."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
                    Sync suggestions
                  </Button>
                  <Button onClick={() => setDialogOpen(true)}>
                    <PlusIcon className="size-4" />
                    Add follow-up
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <Card>
                <CardContent className="space-y-1 p-3 sm:p-4">
                  <div className="mb-2 flex items-center justify-between px-2">
                    <h2 className="text-sm font-medium">Open</h2>
                    <span className="text-xs text-muted-foreground">{openItems.length}</span>
                  </div>
                  {openItems.length === 0 ? (
                    <p className="px-2 py-6 text-sm text-muted-foreground">
                      Nothing open. Sync suggestions or add a follow-up.
                    </p>
                  ) : (
                    openItems.map((item) => renderRow(item, true))
                  )}
                </CardContent>
              </Card>

              {doneItems.length > 0 ? (
                <Card>
                  <CardContent className="space-y-1 p-3 sm:p-4">
                    <div className="mb-2 flex items-center justify-between px-2">
                      <h2 className="text-sm font-medium text-muted-foreground">Done</h2>
                      <span className="text-xs text-muted-foreground">{doneItems.length}</span>
                    </div>
                    {visibleDoneItems.map((item) => renderRow(item, false))}
                    {doneItems.length > visibleDoneItems.length ? (
                      <p className="px-2 pt-2 text-xs text-muted-foreground">
                        Showing the {visibleDoneItems.length} most recent. Older completed items
                        stay in your history.
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setMonth((value) => subMonths(value, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <h2 className="text-sm font-medium">{format(month, "MMMM yyyy")}</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setMonth((value) => addMonths(value, 1))}
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const count = itemsByDay.get(key)?.length ?? 0;
                  const inMonth = isSameMonth(day, month);
                  const selected = isSameDay(day, selectedDay);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "flex min-h-16 flex-col items-start rounded-lg border p-1.5 text-left transition-colors",
                        inMonth
                          ? "border-border/60 bg-background"
                          : "border-transparent bg-muted/20 text-muted-foreground",
                        selected && "border-primary ring-1 ring-primary/30",
                        isToday(day) && !selected && "border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-xs",
                          isToday(day) && "bg-primary text-primary-foreground",
                        )}
                      >
                        {format(day, "d")}
                      </span>
                      {count > 0 ? (
                        <span className="mt-auto text-[10px] font-medium text-primary">
                          {count} open
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-1 p-3 sm:p-4">
              <div className="mb-2 px-2">
                <h2 className="text-sm font-medium">{format(selectedDay, "EEEE, MMM d")}</h2>
              </div>
              {selectedDayItems.length === 0 ? (
                <p className="px-2 py-6 text-sm text-muted-foreground">
                  No open follow-ups on this day.
                </p>
              ) : (
                selectedDayItems.map((item) => renderRow(item, false))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clients={clients}
        invoices={invoices}
        estimates={estimates}
        onCreated={(followUp) =>
          setFollowUps((prev) => {
            const open = prev.filter((item) => item.status === "OPEN");
            const done = prev.filter((item) => item.status === "DONE");
            return [...open, followUp, ...done];
          })
        }
      />
    </>
  );
}
