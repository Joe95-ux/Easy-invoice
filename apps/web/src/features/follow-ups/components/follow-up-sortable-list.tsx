"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type SortableItem = { id: string };

type FollowUpSortableListProps<T extends SortableItem> = {
  items: T[];
  onReorder: (next: T[]) => void | Promise<void>;
  renderItem: (item: T, state: { isDragging: boolean; isOverlay: boolean }) => ReactNode;
  className?: string;
};

const ROW_GAP_PX = 4;
/** Dead zone around slot midpoints so the insert index doesn't flicker. */
const HYSTERESIS_PX = 6;

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'a, button, input, textarea, label, [role="checkbox"], [data-slot="checkbox"], [data-no-dnd]',
    ),
  );
}

function arrayMove<T>(list: T[], from: number, to: number) {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Resolve insert index from a probe Y in list-local coordinates using the
 * layout measured at drag start (ignores live CSS transforms so hit-testing
 * and visual shifts can't fight each other).
 */
function resolveIndexFromProbe(
  probeY: number,
  heights: number[],
  currentIndex: number,
  hysteresis = HYSTERESIS_PX,
) {
  if (heights.length === 0) return 0;

  let acc = 0;
  for (let i = 0; i < heights.length; i += 1) {
    const h = heights[i] ?? 56;
    const midpoint = acc + h / 2;
    const bias =
      i > currentIndex ? hysteresis : i < currentIndex ? -hysteresis : 0;
    if (probeY < midpoint + bias) return i;
    acc += h + ROW_GAP_PX;
  }
  return heights.length - 1;
}

export function FollowUpSortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  className,
}: FollowUpSortableListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLElement>());
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<{
    id: string;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [shifts, setShifts] = useState<Record<string, number>>({});

  const dragRef = useRef<{
    id: string;
    pointerId: number;
    grabOffsetY: number;
    originIndex: number;
    currentIndex: number;
    itemHeight: number;
    heights: number[];
    listTop: number;
    order: T[];
  } | null>(null);

  const computeShifts = useCallback(
    (order: T[], originIndex: number, currentIndex: number, activeHeight: number) => {
      const next: Record<string, number> = {};
      order.forEach((item, index) => {
        if (index === originIndex) {
          next[item.id] = 0;
          return;
        }
        if (originIndex < currentIndex && index > originIndex && index <= currentIndex) {
          next[item.id] = -activeHeight;
        } else if (originIndex > currentIndex && index >= currentIndex && index < originIndex) {
          next[item.id] = activeHeight;
        } else {
          next[item.id] = 0;
        }
      });
      return next;
    },
    [],
  );

  const endDrag = useCallback(
    async (commit: boolean) => {
      const drag = dragRef.current;
      dragRef.current = null;
      setActiveId(null);
      setOverlay(null);
      setShifts({});

      if (!commit || !drag) return;
      if (drag.currentIndex === drag.originIndex) return;

      const next = arrayMove(drag.order, drag.originIndex, drag.currentIndex);
      await onReorder(next);
    },
    [onReorder],
  );

  useEffect(() => {
    if (!activeId) return;

    function probeYFromEvent(clientY: number) {
      const drag = dragRef.current;
      if (!drag) return clientY;
      // Aim with the floating card's vertical center — matches what the eye tracks.
      return clientY - drag.grabOffsetY + drag.itemHeight / 2;
    }

    function resolveIndex(clientY: number) {
      const drag = dragRef.current;
      const list = listRef.current;
      if (!drag || !list) return 0;

      // Refresh list top each move so page scroll during drag stays accurate.
      const listTop = list.getBoundingClientRect().top;
      drag.listTop = listTop;
      const probeY = probeYFromEvent(clientY) - listTop;

      return resolveIndexFromProbe(probeY, drag.heights, drag.currentIndex);
    }

    function onPointerMove(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      setOverlay((prev) =>
        prev
          ? {
              ...prev,
              top: event.clientY - drag.grabOffsetY,
            }
          : prev,
      );

      const nextIndex = resolveIndex(event.clientY);
      if (nextIndex !== drag.currentIndex) {
        drag.currentIndex = nextIndex;
        setShifts(
          computeShifts(
            drag.order,
            drag.originIndex,
            nextIndex,
            drag.itemHeight + ROW_GAP_PX,
          ),
        );
      }
    }

    function onPointerUp(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      // Final resolve so the drop matches where the card actually is.
      drag.currentIndex = resolveIndex(event.clientY);
      void endDrag(true);
    }

    function onPointerCancel(event: PointerEvent) {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      void endDrag(false);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [activeId, computeShifts, endDrag]);

  useLayoutEffect(() => {
    if (!activeId) return;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, [activeId]);

  function onPointerDown(event: React.PointerEvent, id: string) {
    if (event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    const el = rowRefs.current.get(id);
    const list = listRef.current;
    if (!el || !list) return;

    const rect = el.getBoundingClientRect();
    const order = [...itemsRef.current];
    const index = order.findIndex((item) => item.id === id);
    if (index < 0) return;

    event.preventDefault();
    el.setPointerCapture?.(event.pointerId);

    const heights = order.map((item) => rowRefs.current.get(item.id)?.offsetHeight ?? 56);

    dragRef.current = {
      id,
      pointerId: event.pointerId,
      grabOffsetY: event.clientY - rect.top,
      originIndex: index,
      currentIndex: index,
      itemHeight: rect.height,
      heights,
      listTop: list.getBoundingClientRect().top,
      order,
    };

    setActiveId(id);
    setShifts({});
    setOverlay({
      id,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
  }

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null;

  return (
    <div
      ref={listRef}
      data-dragging={activeId ? "" : undefined}
      className={cn(
        "relative space-y-1",
        activeId &&
          "[&_[data-follow-up-row]]:hover:border-transparent [&_[data-follow-up-row]]:hover:bg-transparent",
        className,
      )}
    >
      {items.map((item) => {
        const isDragging = activeId === item.id;
        const shift = shifts[item.id] ?? 0;

        return (
          <div
            key={item.id}
            ref={(node) => {
              if (node) rowRefs.current.set(item.id, node);
              else rowRefs.current.delete(item.id);
            }}
            onPointerDown={(event) => onPointerDown(event, item.id)}
            style={{
              transform: isDragging ? undefined : `translate3d(0, ${shift}px, 0)`,
              transition:
                activeId && !isDragging
                  ? "transform 140ms cubic-bezier(0.25, 1, 0.5, 1)"
                  : "none",
            }}
            className={cn(
              "touch-none rounded-lg will-change-transform",
              isDragging && "opacity-20",
              !isDragging && "cursor-grab active:cursor-grabbing",
            )}
          >
            {renderItem(item, { isDragging, isOverlay: false })}
          </div>
        );
      })}

      {overlay && activeItem && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-100 rounded-lg border border-border/70 bg-background/95 shadow-md backdrop-blur-[1px]"
              style={{
                left: overlay.left,
                top: overlay.top,
                width: overlay.width,
                height: overlay.height,
              }}
            >
              <div className="h-full overflow-hidden rounded-lg">
                {renderItem(activeItem, { isDragging: true, isOverlay: true })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
