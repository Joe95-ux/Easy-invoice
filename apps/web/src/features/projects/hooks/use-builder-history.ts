"use client";

import { useCallback, useRef, useState } from "react";
import type { FormFieldDef } from "@/lib/schemas/project-form";

export type BuilderSnapshot = {
  name: string;
  description: string;
  fields: FormFieldDef[];
  thankYouMessage: string;
};

const MAX_HISTORY = 50;

function cloneSnapshot(snapshot: BuilderSnapshot): BuilderSnapshot {
  return {
    name: snapshot.name,
    description: snapshot.description,
    thankYouMessage: snapshot.thankYouMessage,
    fields: snapshot.fields.map((field) => ({
      ...field,
      options: field.options?.map((option) => ({ ...option })),
      validation: field.validation ? { ...field.validation } : field.validation,
      visibleWhen: field.visibleWhen ? { ...field.visibleWhen } : field.visibleWhen,
    })),
  };
}

export function useBuilderHistory(initial: BuilderSnapshot) {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const pastRef = useRef<BuilderSnapshot[]>([]);
  const futureRef = useRef<BuilderSnapshot[]>([]);
  const currentRef = useRef<BuilderSnapshot>(cloneSnapshot(initial));

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const replaceCurrent = useCallback((next: BuilderSnapshot) => {
    currentRef.current = cloneSnapshot(next);
  }, []);

  /** Call before applying a user edit, with the state *before* the edit. */
  const pushHistory = useCallback(
    (before: BuilderSnapshot) => {
      pastRef.current = [...pastRef.current.slice(-(MAX_HISTORY - 1)), cloneSnapshot(before)];
      futureRef.current = [];
      syncFlags();
    },
    [syncFlags],
  );

  const undo = useCallback((): BuilderSnapshot | null => {
    const previous = pastRef.current[pastRef.current.length - 1];
    if (!previous) return null;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, cloneSnapshot(currentRef.current)];
    currentRef.current = cloneSnapshot(previous);
    syncFlags();
    return cloneSnapshot(previous);
  }, [syncFlags]);

  const redo = useCallback((): BuilderSnapshot | null => {
    const next = futureRef.current[futureRef.current.length - 1];
    if (!next) return null;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, cloneSnapshot(currentRef.current)];
    currentRef.current = cloneSnapshot(next);
    syncFlags();
    return cloneSnapshot(next);
  }, [syncFlags]);

  return {
    canUndo,
    canRedo,
    pushHistory,
    replaceCurrent,
    undo,
    redo,
  };
}
