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
  ListFilterIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, pageHeaderActionClass } from "@/components/app-shell/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FollowUpDialog,
  type FollowUpLinkOption,
  type FollowUpMemberOption,
} from "@/features/follow-ups/components/follow-up-dialog";
import { FollowUpSortableList } from "@/features/follow-ups/components/follow-up-sortable-list";
import type { SerializedFollowUp } from "@/lib/follow-ups/service";
import { cn } from "@/lib/utils";

type DueFilter = "all" | "overdue" | "due_today" | "upcoming" | "no_date";
type TypeFilter = "all" | "invoice" | "estimate" | "client" | "suggestion";
type AssigneeFilter = "all" | "me" | "unassigned" | string;

type FollowUpsPageContentProps = {
  initialFollowUps: SerializedFollowUp[];
  clients: FollowUpLinkOption[];
  invoices: FollowUpLinkOption[];
  estimates: FollowUpLinkOption[];
  members: FollowUpMemberOption[];
  currentMemberId: string;
};

const DUE_FILTER_ITEMS = [
  { value: "all", label: "Any due date" },
  { value: "overdue", label: "Overdue" },
  { value: "due_today", label: "Due today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "no_date", label: "No due date" },
] as const;

const TYPE_FILTER_ITEMS = [
  { value: "all", label: "All types" },
  { value: "invoice", label: "Invoices" },
  { value: "estimate", label: "Estimates" },
  { value: "client", label: "Clients" },
  { value: "suggestion", label: "Suggestions" },
] as const;

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

function assigneeLabel(item: SerializedFollowUp): string | null {
  if (!item.member) return null;
  return item.member.name?.trim() || item.member.email;
}

function dueTone(dueDate: string | null, status: SerializedFollowUp["status"]) {
  if (!dueDate || status === "DONE") return "text-muted-foreground";
  const todayKey = format(new Date(), "yyyy-MM-dd");
  if (dueDate < todayKey) return "text-destructive";
  if (dueDate === todayKey) return "text-amber-700 dark:text-amber-400";
  return "text-muted-foreground";
}

function matchesFilters(
  item: SerializedFollowUp,
  filters: {
    due: DueFilter;
    type: TypeFilter;
    clientId: string;
    assignee: AssigneeFilter;
    currentMemberId: string;
  },
) {
  const todayKey = format(new Date(), "yyyy-MM-dd");

  if (filters.due !== "all") {
    if (filters.due === "no_date" && item.dueDate) return false;
    if (filters.due === "overdue" && (!item.dueDate || item.dueDate >= todayKey)) return false;
    if (filters.due === "due_today" && item.dueDate !== todayKey) return false;
    if (filters.due === "upcoming" && (!item.dueDate || item.dueDate <= todayKey)) return false;
  }

  if (filters.type !== "all") {
    if (filters.type === "invoice" && !item.invoiceId) return false;
    if (filters.type === "estimate" && !item.estimateId) return false;
    if (filters.type === "client" && (item.invoiceId || item.estimateId || !item.clientId)) {
      return false;
    }
    if (filters.type === "suggestion" && item.source === "MANUAL") return false;
  }

  if (filters.clientId !== "all" && item.clientId !== filters.clientId) return false;

  if (filters.assignee === "me" && item.memberId !== filters.currentMemberId) return false;
  if (filters.assignee === "unassigned" && item.memberId) return false;
  if (
    filters.assignee !== "all" &&
    filters.assignee !== "me" &&
    filters.assignee !== "unassigned" &&
    item.memberId !== filters.assignee
  ) {
    return false;
  }

  return true;
}

function FollowUpRow({
  item,
  showHandle,
  busy,
  onToggle,
  onEdit,
  onDelete,
}: {
  item: SerializedFollowUp;
  showHandle: boolean;
  busy: boolean;
  onToggle: (item: SerializedFollowUp) => void;
  onEdit: (item: SerializedFollowUp) => void;
  onDelete: (item: SerializedFollowUp) => void;
}) {
  const href = linkHref(item);
  const label = linkLabel(item);
  const source = sourceLabel(item.source);
  const assignee = assigneeLabel(item);
  const showClientBesideDoc =
    Boolean(item.client) && Boolean(item.invoiceId || item.estimateId);

  return (
    <div
      data-follow-up-row=""
      className={cn(
        "group flex items-start gap-3 rounded-lg border border-transparent px-2 py-2.5 transition-colors",
        "hover:border-border hover:bg-muted/40",
        item.status === "DONE" && "opacity-70",
      )}
    >
      {showHandle ? (
        <span className="mt-0.5 text-muted-foreground" aria-hidden>
          <GripVerticalIcon className="size-4" />
        </span>
      ) : (
        <span className="mt-0.5 size-4 shrink-0" />
      )}

      <Checkbox
        checked={item.status === "DONE"}
        data-no-dnd=""
        onCheckedChange={() => onToggle(item)}
        className="mt-0.5 cursor-pointer"
        aria-label={item.status === "DONE" ? "Mark open" : "Mark done"}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-no-dnd=""
            onClick={() => onEdit(item)}
            className={cn(
              "cursor-pointer text-left text-sm font-medium hover:underline",
              item.status === "DONE" && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </button>
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
            <Link href={href} className="cursor-pointer text-primary hover:underline" data-no-dnd="">
              {label}
            </Link>
          ) : null}
          {showClientBesideDoc ? (
            <span className="text-muted-foreground">{item.client!.name}</span>
          ) : null}
          {assignee ? (
            <span className="text-muted-foreground">· {assignee}</span>
          ) : null}
        </div>
        {item.notes ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.notes}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-no-dnd=""
          className="size-8 cursor-pointer opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
          disabled={busy}
          onClick={() => onEdit(item)}
          aria-label="Edit follow-up"
        >
          <PencilIcon className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          data-no-dnd=""
          className="size-8 cursor-pointer opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
          disabled={busy}
          onClick={() => onDelete(item)}
          aria-label="Delete follow-up"
        >
          {busy ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <Trash2Icon className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function FollowUpsPageContent({
  initialFollowUps,
  clients,
  invoices,
  estimates,
  members,
  currentMemberId,
}: FollowUpsPageContentProps) {
  const [followUps, setFollowUps] = useState(initialFollowUps);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SerializedFollowUp | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SerializedFollowUp | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>("all");
  const toggleGenRef = useRef(new Map<string, number>());

  const filters = useMemo(
    () => ({
      due: dueFilter,
      type: typeFilter,
      clientId: clientFilter,
      assignee: assigneeFilter,
      currentMemberId,
    }),
    [dueFilter, typeFilter, clientFilter, assigneeFilter, currentMemberId],
  );

  const filtersActive =
    dueFilter !== "all" ||
    typeFilter !== "all" ||
    clientFilter !== "all" ||
    assigneeFilter !== "all";

  const filteredFollowUps = useMemo(
    () => followUps.filter((item) => matchesFilters(item, filters)),
    [followUps, filters],
  );

  const openItems = useMemo(
    () => filteredFollowUps.filter((item) => item.status === "OPEN"),
    [filteredFollowUps],
  );
  const doneItems = useMemo(
    () =>
      filteredFollowUps
        .filter((item) => item.status === "DONE")
        .sort((a, b) =>
          (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
        ),
    [filteredFollowUps],
  );
  const visibleDoneItems = doneItems.slice(0, 40);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, SerializedFollowUp[]>();
    for (const item of filteredFollowUps) {
      if (!item.dueDate || item.status === "DONE") continue;
      const list = map.get(item.dueDate) ?? [];
      list.push(item);
      map.set(item.dueDate, list);
    }
    return map;
  }, [filteredFollowUps]);

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  const selectedDayKey = format(selectedDay, "yyyy-MM-dd");
  const selectedDayItems = itemsByDay.get(selectedDayKey) ?? [];

  const clientFilterItems = useMemo(
    () => [
      { value: "all", label: "All clients" },
      ...clients.map((client) => ({ value: client.id, label: client.label })),
    ],
    [clients],
  );

  const assigneeFilterItems = useMemo(
    () => [
      { value: "all", label: "Anyone" },
      { value: "me", label: "Assigned to me" },
      { value: "unassigned", label: "Unassigned" },
      ...members.map((member) => ({ value: member.id, label: member.label })),
    ],
    [members],
  );

  function sortFollowUps(items: SerializedFollowUp[]) {
    const open = items
      .filter((item) => item.status === "OPEN")
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    const done = items
      .filter((item) => item.status === "DONE")
      .sort((a, b) =>
        (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt),
      );
    return [...open, ...done];
  }

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: SerializedFollowUp) {
    setEditing(item);
    setDialogOpen(true);
  }

  function clearFilters() {
    setDueFilter("all");
    setTypeFilter("all");
    setClientFilter("all");
    setAssigneeFilter("all");
    setFiltersOpen(false);
  }

  async function handleToggle(item: SerializedFollowUp) {
    const nextStatus = item.status === "OPEN" ? "DONE" : "OPEN";
    const now = new Date().toISOString();
    const gen = (toggleGenRef.current.get(item.id) ?? 0) + 1;
    toggleGenRef.current.set(item.id, gen);

    let snapshot: SerializedFollowUp[] = [];
    setFollowUps((prev) => {
      snapshot = prev;
      return sortFollowUps(
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: nextStatus,
                completedAt: nextStatus === "DONE" ? now : null,
                updatedAt: now,
              }
            : entry,
        ),
      );
    });

    try {
      const res = await fetch(`/api/follow-ups/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (toggleGenRef.current.get(item.id) !== gen) return;
      const updated = data.followUp as SerializedFollowUp;
      setFollowUps((prev) =>
        sortFollowUps(prev.map((entry) => (entry.id === item.id ? updated : entry))),
      );
    } catch (error) {
      if (toggleGenRef.current.get(item.id) !== gen) return;
      setFollowUps(snapshot);
      toast.error(error instanceof Error ? error.message : "Could not update follow-up");
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const id = pendingDelete.id;
    setBusyId(id);
    try {
      const res = await fetch(`/api/follow-ups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Delete failed");
      }
      setFollowUps((prev) => prev.filter((item) => item.id !== id));
      setPendingDelete(null);
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

  async function handleReorder(nextOpen: SerializedFollowUp[]) {
    // Reorder against the full open list so filtered views don't scramble global order.
    const filteredIds = new Set(nextOpen.map((item) => item.id));
    const previousOpen = followUps.filter((item) => item.status === "OPEN");
    const nextFilteredQueue = [...nextOpen];
    const mergedOpen = previousOpen.map((item) =>
      filteredIds.has(item.id) ? nextFilteredQueue.shift()! : item,
    );

    let previous: SerializedFollowUp[] = [];
    setFollowUps((prev) => {
      previous = prev;
      const done = prev.filter((item) => item.status === "DONE");
      return [...mergedOpen, ...done];
    });

    try {
      const res = await fetch("/api/follow-ups/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: mergedOpen.map((item) => item.id) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Reorder failed");
      setFollowUps(data.followUps as SerializedFollowUp[]);
      toast.success("Order updated");
    } catch (error) {
      setFollowUps(previous);
      toast.error(error instanceof Error ? error.message : "Could not reorder");
    }
  }

  function handleSaved(followUp: SerializedFollowUp) {
    setFollowUps((prev) => {
      const exists = prev.some((item) => item.id === followUp.id);
      if (exists) {
        return sortFollowUps(prev.map((item) => (item.id === followUp.id ? followUp : item)));
      }
      const open = prev.filter((item) => item.status === "OPEN");
      const done = prev.filter((item) => item.status === "DONE");
      return [...open, followUp, ...done];
    });
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
            <Button onClick={openCreate}>
              <PlusIcon className="size-4" />
              Add follow-up
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="list" className="gap-4">
        <div className="flex items-center gap-3">
          <TabsList variant="segment" className="shrink-0">
            <TabsTrigger value="list">Checklist</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>

          <div className="flex min-w-0 flex-1 items-center justify-end overflow-hidden">
            {!filtersOpen ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-8 shrink-0"
                onClick={() => setFiltersOpen(true)}
                aria-label="Show filters"
              >
                <ListFilterIcon className="size-4" />
              </Button>
            ) : (
              <div className="flex min-w-0 max-w-full items-center gap-1.5 animate-in fade-in slide-in-from-right-4 duration-200">
                <div className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto">
                  <Select
                    value={dueFilter}
                    onValueChange={(value) => value && setDueFilter(value as DueFilter)}
                    items={[...DUE_FILTER_ITEMS]}
                  >
                    <SelectTrigger className="h-8 w-[150px] shrink-0 data-[size=default]:h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {DUE_FILTER_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={typeFilter}
                    onValueChange={(value) => value && setTypeFilter(value as TypeFilter)}
                    items={[...TYPE_FILTER_ITEMS]}
                  >
                    <SelectTrigger className="h-8 w-[140px] shrink-0 data-[size=default]:h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {TYPE_FILTER_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={clientFilter}
                    onValueChange={(value) => value && setClientFilter(value)}
                    items={clientFilterItems}
                  >
                    <SelectTrigger className="h-8 w-[160px] shrink-0 data-[size=default]:h-8">
                      <SelectValue placeholder="All clients" />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {clientFilterItems.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {members.length > 0 ? (
                    <Select
                      value={assigneeFilter}
                      onValueChange={(value) => value && setAssigneeFilter(value)}
                      items={assigneeFilterItems}
                    >
                      <SelectTrigger className="h-8 w-[160px] shrink-0 data-[size=default]:h-8">
                        <SelectValue placeholder="Anyone" />
                      </SelectTrigger>
                      <SelectContent align="end">
                        {assigneeFilterItems.map((item) => (
                          <SelectItem key={item.value} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={clearFilters}
                  aria-label="Clear filters"
                >
                  <XIcon className="size-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <TabsContent value="list" className="space-y-6">
          {followUps.length === 0 ? (
            <EmptyState
              icon={CheckSquareIcon}
              title="No follow-ups yet"
              description="Add a manual follow-up, or sync suggestions from overdue invoices and expiring estimates."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => void handleSync()} disabled={syncing}>
                    Sync suggestions
                  </Button>
                  <Button onClick={openCreate}>
                    <PlusIcon className="size-4" />
                    Add follow-up
                  </Button>
                </div>
              }
            />
          ) : openItems.length === 0 && doneItems.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No follow-ups match your filters.
                {filtersActive ? (
                  <div className="mt-3">
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
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
                      Nothing open
                      {filtersActive ? " matches these filters" : ""}. Sync suggestions or add a
                      follow-up.
                    </p>
                  ) : (
                    <FollowUpSortableList
                      items={openItems}
                      onReorder={handleReorder}
                      renderItem={(item) => (
                        <FollowUpRow
                          item={item}
                          showHandle
                          busy={busyId === item.id}
                          onToggle={handleToggle}
                          onEdit={openEdit}
                          onDelete={setPendingDelete}
                        />
                      )}
                    />
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
                    {visibleDoneItems.map((item) => (
                      <FollowUpRow
                        key={item.id}
                        item={item}
                        showHandle={false}
                        busy={busyId === item.id}
                        onToggle={handleToggle}
                        onEdit={openEdit}
                        onDelete={setPendingDelete}
                      />
                    ))}
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
                selectedDayItems.map((item) => (
                  <FollowUpRow
                    key={item.id}
                    item={item}
                    showHandle={false}
                    busy={busyId === item.id}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={setPendingDelete}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FollowUpDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        clients={clients}
        invoices={invoices}
        estimates={estimates}
        members={members}
        currentMemberId={currentMemberId}
        followUp={editing}
        onSaved={handleSaved}
      />

      <AlertDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && busyId !== pendingDelete?.id) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete follow-up?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete
              {pendingDelete ? (
                <>
                  {" "}
                  <span className="font-medium text-foreground">
                    “{pendingDelete.title}”
                  </span>
                </>
              ) : null}
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === pendingDelete?.id}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busyId === pendingDelete?.id}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              {busyId === pendingDelete?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
