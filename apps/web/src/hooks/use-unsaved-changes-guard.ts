"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PendingLeave =
  | { type: "href"; href: string }
  | { type: "back" };

type UseUnsavedChangesGuardOptions = {
  /** When true, navigating away prompts for confirmation. */
  enabled: boolean;
};

/**
 * Warns before leaving a page with in-progress work.
 * Covers in-app link clicks, browser back, and tab close / refresh.
 */
export function useUnsavedChangesGuard({ enabled }: UseUnsavedChangesGuardOptions) {
  const router = useRouter();
  const enabledRef = useRef(enabled);
  const bypassRef = useRef(false);
  const pendingRef = useRef<PendingLeave | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  enabledRef.current = enabled;

  const allowNextNavigation = useCallback(() => {
    bypassRef.current = true;
  }, []);

  const requestLeave = useCallback((pending: PendingLeave) => {
    pendingRef.current = pending;
    setDialogOpen(true);
  }, []);

  const cancelLeave = useCallback(() => {
    pendingRef.current = null;
    setDialogOpen(false);
  }, []);

  const confirmLeave = useCallback(() => {
    const pending = pendingRef.current;
    pendingRef.current = null;
    setDialogOpen(false);
    bypassRef.current = true;

    if (!pending) return;

    if (pending.type === "back") {
      // Undo the guard re-push, then leave to the page the user wanted.
      window.history.go(-2);
      return;
    }

    if (/^https?:\/\//i.test(pending.href)) {
      window.location.href = pending.href;
      return;
    }

    router.push(pending.href);
  }, [router]);

  /** Programmatic navigate that respects the guard (e.g. Cancel buttons). */
  const guardedPush = useCallback(
    (href: string) => {
      if (!enabledRef.current || bypassRef.current) {
        bypassRef.current = true;
        router.push(href);
        return;
      }
      requestLeave({ type: "href", href });
    },
    [requestLeave, router],
  );

  useEffect(() => {
    if (!enabled) {
      setDialogOpen(false);
      pendingRef.current = null;
      return;
    }

    // After allowNextNavigation() (successful save), keep bypass armed and do not
    // push a new history entry — that can cancel an in-flight router.push.
    if (bypassRef.current) {
      return;
    }

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypassRef.current || !enabledRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (bypassRef.current || !enabledRef.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (anchor.dataset.allowUnsavedNav != null) return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;
      if (rawHref.startsWith("mailto:") || rawHref.startsWith("tel:")) return;

      let url: URL;
      try {
        url = new URL(rawHref, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) {
        event.preventDefault();
        event.stopPropagation();
        requestLeave({ type: "href", href: url.href });
        return;
      }

      const next = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (next === current) return;

      event.preventDefault();
      event.stopPropagation();
      requestLeave({ type: "href", href: next });
    };

    const guardState = { __unsavedGuard: true as const };
    window.history.pushState(guardState, "", window.location.href);

    const onPopState = () => {
      if (bypassRef.current || !enabledRef.current) return;
      window.history.pushState(guardState, "", window.location.href);
      requestLeave({ type: "back" });
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onDocumentClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [enabled, requestLeave]);

  return {
    leaveDialogOpen: dialogOpen,
    confirmLeave,
    cancelLeave,
    allowNextNavigation,
    guardedPush,
  };
}
