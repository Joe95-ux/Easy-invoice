"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TIMER_REMINDER_SECONDS, useElapsedSeconds } from "@/hooks/use-elapsed-seconds";
import type { StartTimeTimerInput } from "@/lib/schemas/time-timer";
import { invoiceFromTimeUrl } from "@/lib/time-tracking/invoice-from-time";

export type SerializedActiveTimer = {
  id: string;
  clientId: string | null;
  clientName: string | null;
  description: string;
  startedAt: string;
  billable: boolean;
  hourlyRate: number;
};

type TimeTimerContextValue = {
  timer: SerializedActiveTimer | null;
  defaultHourlyRate: number | null;
  currency: string;
  isLoading: boolean;
  isBusy: boolean;
  elapsedSeconds: number;
  startDrawerOpen: boolean;
  setStartDrawerOpen: (open: boolean) => void;
  activeDrawerOpen: boolean;
  setActiveDrawerOpen: (open: boolean) => void;
  openStartTimer: () => void;
  openActiveTimer: () => void;
  toggleActiveTimer: () => void;
  refreshTimer: () => Promise<void>;
  startTimer: (input: StartTimeTimerInput) => Promise<void>;
  updateTimer: (input: Partial<StartTimeTimerInput>) => Promise<void>;
  stopTimer: () => Promise<void>;
  discardTimer: () => Promise<void>;
};

const TimeTimerContext = createContext<TimeTimerContextValue | null>(null);

export function useTimeTimer() {
  const context = useContext(TimeTimerContext);
  if (!context) {
    throw new Error("useTimeTimer must be used within TimeTimerProvider");
  }
  return context;
}

export function TimeTimerProvider({
  activeCompanyId,
  children,
}: {
  activeCompanyId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [timer, setTimer] = useState<SerializedActiveTimer | null>(null);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState<number | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [startDrawerOpen, setStartDrawerOpen] = useState(false);
  const [activeDrawerOpen, setActiveDrawerOpen] = useState(false);
  const remindedRef = useRef(false);

  const elapsedSeconds = useElapsedSeconds(timer?.startedAt ?? null, Boolean(timer));

  const refreshTimer = useCallback(async () => {
    try {
      const response = await fetch("/api/time-timer");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to load timer");

      setTimer(body.timer ?? null);
      setDefaultHourlyRate(body.defaultHourlyRate ?? null);
      setCurrency(body.currency ?? "USD");
    } catch {
      // Keep last known timer state if refresh fails briefly.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    setStartDrawerOpen(false);
    setActiveDrawerOpen(false);
    void refreshTimer();
  }, [activeCompanyId, refreshTimer]);

  useEffect(() => {
    if (!timer) {
      remindedRef.current = false;
      return;
    }

    if (elapsedSeconds >= TIMER_REMINDER_SECONDS && !remindedRef.current) {
      remindedRef.current = true;
      toast.message("Timer still running", {
        description: "Stop the timer when you're done to log this time.",
        action: {
          label: "Open timer",
          onClick: () => setActiveDrawerOpen(true),
        },
      });
    }
  }, [timer, elapsedSeconds]);

  const openStartTimer = useCallback(() => {
    if (timer) {
      setActiveDrawerOpen(true);
      return;
    }
    setStartDrawerOpen(true);
  }, [timer]);

  const openActiveTimer = useCallback(() => {
    if (timer) setActiveDrawerOpen(true);
  }, [timer]);

  const toggleActiveTimer = useCallback(() => {
    if (!timer) return;
    setActiveDrawerOpen((prev) => !prev);
  }, [timer]);

  const startTimer = useCallback(
    async (input: StartTimeTimerInput) => {
      setIsBusy(true);
      try {
        const response = await fetch("/api/time-timer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to start timer");

        setTimer(body.timer);
        setStartDrawerOpen(false);
        setActiveDrawerOpen(true);
        toast.success("Timer started");
      } finally {
        setIsBusy(false);
      }
    },
    [],
  );

  const updateTimer = useCallback(async (input: Partial<StartTimeTimerInput>) => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/time-timer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to update timer");

      setTimer(body.timer);
      toast.success("Timer updated");
    } finally {
      setIsBusy(false);
    }
  }, []);

  const stopTimer = useCallback(async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/time-timer/stop", { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to stop timer");

      setTimer(null);
      setActiveDrawerOpen(false);
      router.refresh();

      const entry = body.entry as {
        clientId: string | null;
        billable: boolean;
      };

      if (entry.billable && entry.clientId) {
        toast.success("Time logged from timer", {
          action: {
            label: "Create invoice",
            onClick: () =>
              router.push(invoiceFromTimeUrl({ clientId: entry.clientId!, openPicker: true })),
          },
        });
      } else {
        toast.success("Time logged from timer");
      }
    } finally {
      setIsBusy(false);
    }
  }, [router]);

  const discardTimer = useCallback(async () => {
    setIsBusy(true);
    try {
      const response = await fetch("/api/time-timer", { method: "DELETE" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to discard timer");

      setTimer(null);
      setActiveDrawerOpen(false);
      toast.message("Timer discarded");
    } finally {
      setIsBusy(false);
    }
  }, []);

  const value = useMemo<TimeTimerContextValue>(
    () => ({
      timer,
      defaultHourlyRate,
      currency,
      isLoading,
      isBusy,
      elapsedSeconds,
      startDrawerOpen,
      setStartDrawerOpen,
      activeDrawerOpen,
      setActiveDrawerOpen,
      openStartTimer,
      openActiveTimer,
      toggleActiveTimer,
      refreshTimer,
      startTimer,
      updateTimer,
      stopTimer,
      discardTimer,
    }),
    [
      timer,
      defaultHourlyRate,
      currency,
      isLoading,
      isBusy,
      elapsedSeconds,
      startDrawerOpen,
      activeDrawerOpen,
      openStartTimer,
      openActiveTimer,
      toggleActiveTimer,
      refreshTimer,
      startTimer,
      updateTimer,
      stopTimer,
      discardTimer,
    ],
  );

  return <TimeTimerContext.Provider value={value}>{children}</TimeTimerContext.Provider>;
}
