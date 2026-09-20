"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  AtSignIcon,
  CalendarIcon,
  CheckSquareIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  CircleDotIcon,
  ClipboardListIcon,
  EyeIcon,
  GripVerticalIcon,
  HashIcon,
  ImageIcon,
  Link2Icon,
  ListIcon,
  Loader2Icon,
  PanelLeftIcon,
  PanelRightIcon,
  PanelTopIcon,
  PhoneIcon,
  PlusIcon,
  Redo2Icon,
  Rows3Icon,
  SaveIcon,
  SendIcon,
  TextCursorInputIcon,
  ToggleLeftIcon,
  TypeIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BuilderInspector } from "@/features/projects/components/advanced-form-builder/builder-inspector";
import { PublicProjectForm } from "@/features/projects/components/public-project-form";
import {
  buildFormField,
  cloneFieldsWithNewIds,
  countAnswerable,
  ensureBuilderSections,
  FIELD_LIBRARY,
  groupFieldsForBuilder,
  insertFieldAfter,
  insertFieldAtSectionEnd,
  insertFieldRelative,
  isHalfWidthField,
  moveFieldInList,
  moveSectionBlock,
  moveSectionByOffset,
  placeholderForField,
} from "@/features/projects/lib/form-field-factory";
import {
  useBuilderHistory,
  type BuilderSnapshot,
} from "@/features/projects/hooks/use-builder-history";
import { estimateFromSubmissionUrl } from "@/lib/form-submission-to-estimate";
import { formatDate } from "@/lib/invoices";
import { newFormFieldId } from "@/lib/project-form-ids";
import {
  formatFormAnswerPlain,
  isAnswerableFormField,
  isStructuralFormField,
  type FormFieldDef,
  type FormFieldType,
} from "@/lib/schemas/project-form";
import { cn } from "@/lib/utils";

const FIELD_DRAG_MIME = "application/x-form-field-id";
const SECTION_DRAG_MIME = "application/x-form-section-id";
const LIBRARY_DRAG_MIME = "application/x-form-library-type";
const INSPECTOR_DOCK_MIN = 1280;

type DropTarget =
  | {
      kind: "field";
      id: string;
      position: "before" | "after";
      axis: "x" | "y";
    }
  | { kind: "section"; id: string; position: "before" | "after" }
  | { kind: "section-body"; sectionId: string };

/** Prefer left/right for side-by-side fields; top/bottom for stacked. */
function getFieldDropIntent(
  event: DragEvent,
  element: HTMLElement,
): { position: "before" | "after"; axis: "x" | "y" } {
  const rect = element.getBoundingClientRect();
  const relX = (event.clientX - rect.left) / Math.max(rect.width, 1);
  const relY = (event.clientY - rect.top) / Math.max(rect.height, 1);
  const distLeft = relX;
  const distRight = 1 - relX;
  const distTop = relY;
  const distBottom = 1 - relY;
  const minH = Math.min(distLeft, distRight);
  const minV = Math.min(distTop, distBottom);
  if (minH <= minV) {
    return { position: distLeft < distRight ? "before" : "after", axis: "x" };
  }
  return { position: distTop < distBottom ? "before" : "after", axis: "y" };
}

type TemplateSummary = {
  id: string;
  name: string;
  description: string | null;
  fields: FormFieldDef[];
};

type AdvancedFormBuilderProps = {
  projectId: string;
  projectName: string;
  formId: string;
  initialName: string;
  initialDescription?: string | null;
  initialThankYouMessage?: string | null;
  initialStatus: string;
  initialFields: FormFieldDef[];
  initialPublicToken?: string | null;
  templateName?: string | null;
  companyName?: string;
  brandColor?: string | null;
  logoUrl?: string | null;
  logoBg?: string | null;
};

type ResponsesDetail = {
  id: string;
  name: string;
  fields: FormFieldDef[];
  submissions: Array<{
    id: string;
    answers: Record<string, string>;
    submitterName: string | null;
    submitterEmail: string | null;
    submittedAt: string;
  }>;
};

const DEFAULT_FORM_DESCRIPTION =
  "Collect the information, files, and decisions needed before work begins.";

const FIELD_ICONS: Record<FormFieldType, ReactNode> = {
  text: <TypeIcon className="size-3.5" />,
  textarea: <TextCursorInputIcon className="size-3.5" />,
  email: <AtSignIcon className="size-3.5" />,
  phone: <PhoneIcon className="size-3.5" />,
  number: <HashIcon className="size-3.5" />,
  url: <Link2Icon className="size-3.5" />,
  date: <CalendarIcon className="size-3.5" />,
  select: <ListIcon className="size-3.5" />,
  radio: <CircleDotIcon className="size-3.5" />,
  checkbox: <CheckSquareIcon className="size-3.5" />,
  yesno: <ToggleLeftIcon className="size-3.5" />,
  images: <ImageIcon className="size-3.5" />,
  section: <Rows3Icon className="size-3.5" />,
  page: <PanelTopIcon className="size-3.5" />,
};

function setTransparentDragImage(event: DragEvent) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  event.dataTransfer.setDragImage(canvas, 0, 0);
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "SENT":
      return "Shared";
    case "COMPLETED":
      return "Completed";
    default:
      return status;
  }
}

function isLibraryType(value: string): value is FormFieldType {
  return FIELD_LIBRARY.some((item) => item.type === value);
}

export function AdvancedFormBuilder({
  projectId,
  projectName,
  formId,
  initialName,
  initialDescription = null,
  initialThankYouMessage = null,
  initialStatus,
  initialFields,
  initialPublicToken = null,
  templateName = null,
  companyName = "Your company",
  brandColor = null,
  logoUrl = null,
  logoBg = null,
}: AdvancedFormBuilderProps) {
  const router = useRouter();
  const bootstrapped = ensureBuilderSections(initialFields);
  const initialThankYou = initialThankYouMessage?.trim() || "";
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(
    initialDescription?.trim() || DEFAULT_FORM_DESCRIPTION,
  );
  const [thankYouMessage, setThankYouMessage] = useState(initialThankYou);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingThankYou, setEditingThankYou] = useState(false);
  const [fields, setFields] = useState<FormFieldDef[]>(bootstrapped.fields);
  const [status, setStatus] = useState(initialStatus);
  const [publicToken, setPublicToken] = useState<string | null>(initialPublicToken);
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      bootstrapped.fields.find((field) => !isStructuralFormField(field))?.id ??
      bootstrapped.fields[0]?.id ??
      null,
  );
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [dirty, setDirty] = useState(bootstrapped.changed);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leftDocked, setLeftDocked] = useState(true);
  const [rightDocked, setRightDocked] = useState(true);
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [inspectorSheetOpen, setInspectorSheetOpen] = useState(false);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [responsesDetail, setResponsesDetail] = useState<ResponsesDetail | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingLibraryType, setDraggingLibraryType] = useState<FormFieldType | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const draggingFieldRef = useRef<string | null>(null);
  const draggingSectionRef = useRef<string | null>(null);
  const draggingLibraryRef = useRef<FormFieldType | null>(null);
  const suppressClickRef = useRef(false);
  const metaHistoryPushedRef = useRef(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const dirtyGenerationRef = useRef(0);

  const bumpDirty = useCallback(() => {
    dirtyGenerationRef.current += 1;
    setDirty(true);
    setSaveState("idle");
  }, []);

  const { canUndo, canRedo, pushHistory, replaceCurrent, undo, redo } = useBuilderHistory({
    name: initialName,
    description: initialDescription?.trim() || DEFAULT_FORM_DESCRIPTION,
    thankYouMessage: initialThankYou,
    fields: bootstrapped.fields,
  });

  const canEdit = status === "DRAFT";
  const selected = fields.find((field) => field.id === selectedId) ?? null;
  const sections = useMemo(() => groupFieldsForBuilder(fields), [fields]);
  const answerableCount = countAnswerable(fields);
  const sectionCount = fields.filter((field) => field.type === "section").length;
  const realSectionIds = useMemo(
    () => fields.filter(isStructuralFormField).map((field) => field.id),
    [fields],
  );
  const isPaletteDragging = draggingLibraryType !== null;
  const isReordering =
    draggingFieldId !== null || draggingSectionId !== null || isPaletteDragging;

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTemplatesLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/form-templates");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load templates");
        if (!cancelled) setTemplates((body.templates ?? []) as TemplateSummary[]);
      } catch {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markDirty = useCallback(
    (next: FormFieldDef[]) => {
      pushHistory({ name, description, thankYouMessage, fields });
      setFields(next);
      bumpDirty();
      replaceCurrent({ name, description, thankYouMessage, fields: next });
    },
    [bumpDirty, description, fields, name, pushHistory, replaceCurrent, thankYouMessage],
  );

  const applyHistorySnapshot = useCallback(
    (snapshot: BuilderSnapshot) => {
      setName(snapshot.name);
      setDescription(snapshot.description);
      setThankYouMessage(snapshot.thankYouMessage);
      setFields(snapshot.fields);
      bumpDirty();
    },
    [bumpDirty],
  );

  const beginMetaHistory = useCallback(() => {
    if (metaHistoryPushedRef.current) return;
    pushHistory({ name, description, thankYouMessage, fields });
    metaHistoryPushedRef.current = true;
  }, [description, fields, name, pushHistory, thankYouMessage]);

  const finishMetaHistory = useCallback(() => {
    replaceCurrent({ name, description, thankYouMessage, fields });
    metaHistoryPushedRef.current = false;
  }, [description, fields, name, replaceCurrent, thankYouMessage]);

  const persist = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!name.trim()) {
        if (!options?.silent) toast.error("Form name is required");
        return false;
      }
      if (canEdit && fields.filter(isAnswerableFormField).length === 0) {
        if (!options?.silent) toast.error("Add at least one question");
        return false;
      }
      if (canEdit && fields.some((field) => !field.label.trim())) {
        if (!options?.silent) toast.error("Every field needs a label");
        return false;
      }
      if (
        canEdit &&
        fields.some(
          (field) =>
            (field.type === "select" || field.type === "radio" || field.type === "checkbox") &&
            (!field.options || field.options.length === 0),
        )
      ) {
        if (!options?.silent) toast.error("Choice fields need at least one option");
        return false;
      }

      setSaving(true);
      const generation = dirtyGenerationRef.current;
      try {
        const response = await fetch(`/api/projects/${projectId}/forms/${formId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            thankYouMessage: thankYouMessage.trim() || null,
            ...(canEdit ? { fields } : {}),
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to save");
        if (dirtyGenerationRef.current === generation) {
          setDirty(false);
        }
        setSaveState("saved");
        if (!options?.silent) toast.success("Form saved");
        router.refresh();
        return true;
      } catch (error) {
        setSaveState("error");
        if (!options?.silent) {
          toast.error(error instanceof Error ? error.message : "Could not save form");
        }
        return false;
      } finally {
        setSaving(false);
      }
    },
    [canEdit, description, fields, formId, name, projectId, router, thankYouMessage],
  );

  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => {
      void persist({ silent: true });
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [dirty, persist]);

  useEffect(() => {
    if (!responsesOpen) return;
    let cancelled = false;
    setResponsesLoading(true);
    setResponsesDetail(null);
    void (async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/forms/${formId}`);
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Failed to load responses");
        if (!cancelled) setResponsesDetail(body.form as ResponsesDetail);
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Could not load responses");
          setResponsesOpen(false);
        }
      } finally {
        if (!cancelled) setResponsesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [responsesOpen, projectId, formId]);

  const deleteSelectedRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "s") {
        event.preventDefault();
        void persist();
        return;
      }

      if (typing) return;

      if (mod && key === "z" && !event.shiftKey) {
        event.preventDefault();
        const snapshot = undo();
        if (snapshot) applyHistorySnapshot(snapshot);
        return;
      }

      if ((mod && key === "z" && event.shiftKey) || (event.ctrlKey && key === "y")) {
        event.preventDefault();
        const snapshot = redo();
        if (snapshot) applyHistorySnapshot(snapshot);
        return;
      }

      if (event.key === "Escape") {
        setSelectedId(null);
        setInspectorSheetOpen(false);
        return;
      }

      if (
        canEdit &&
        (event.key === "Delete" || event.key === "Backspace") &&
        selectedId
      ) {
        event.preventDefault();
        deleteSelectedRef.current();
        return;
      }

      if (
        canEdit &&
        event.altKey &&
        (event.key === "ArrowUp" || event.key === "ArrowDown") &&
        selectedId
      ) {
        const selectedField = fields.find((field) => field.id === selectedId);
        if (!selectedField || isStructuralFormField(selectedField)) return;
        const answerable = fields.filter(isAnswerableFormField);
        const index = answerable.findIndex((field) => field.id === selectedId);
        if (index < 0) return;
        const neighbor =
          event.key === "ArrowUp" ? answerable[index - 1] : answerable[index + 1];
        if (!neighbor) return;
        event.preventDefault();
        markDirty(
          moveFieldInList(
            fields,
            selectedId,
            neighbor.id,
            event.key === "ArrowUp" ? "before" : "after",
          ),
        );
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    applyHistorySnapshot,
    canEdit,
    fields,
    markDirty,
    persist,
    redo,
    selectedId,
    undo,
  ]);

  function revealInspector() {
    if (typeof window !== "undefined" && window.innerWidth >= INSPECTOR_DOCK_MIN) {
      setRightDocked(true);
      return;
    }
    setInspectorSheetOpen(true);
  }

  function selectField(id: string) {
    if (suppressClickRef.current) return;
    setSelectedId(id);
    revealInspector();
  }

  function updateSelected(patch: Partial<FormFieldDef>) {
    if (!selectedId || !canEdit) return;
    markDirty(
      fields.map((field) => (field.id === selectedId ? { ...field, ...patch } : field)),
    );
  }

  function addField(type: FormFieldType, sectionId?: string, afterFieldId?: string) {
    if (!canEdit) return;
    if (fields.length >= 60) {
      toast.error("Forms can have at most 60 fields");
      return;
    }
    const field = buildFormField(type);
    let next: FormFieldDef[];
    if (afterFieldId) {
      next = insertFieldAfter(fields, afterFieldId, field);
    } else if (sectionId) {
      next = insertFieldAtSectionEnd(fields, sectionId, field);
    } else if (selectedId) {
      next = insertFieldAfter(fields, selectedId, field);
    } else {
      next = [...fields, field];
    }
    markDirty(next);
    setSelectedId(field.id);
    setLeftSheetOpen(false);
    revealInspector();
  }

  function applyTemplate(template: TemplateSummary) {
    if (!canEdit) return;
    if (
      answerableCount > 0 &&
      !window.confirm(`Replace the current fields with “${template.name}”?`)
    ) {
      return;
    }
    const applied = ensureBuilderSections(cloneFieldsWithNewIds(template.fields)).fields;
    const nextDescription = template.description?.trim() || description;
    pushHistory({ name, description, thankYouMessage, fields });
    setFields(applied);
    setDescription(nextDescription);
    bumpDirty();
    replaceCurrent({
      name,
      description: nextDescription,
      thankYouMessage,
      fields: applied,
    });
    setSelectedId(
      applied.find((field) => !isStructuralFormField(field))?.id ?? applied[0]?.id ?? null,
    );
    toast.success(`Applied “${template.name}”`);
  }

  function duplicateSelected() {
    if (!selected || !canEdit) return;
    const copy: FormFieldDef = {
      ...selected,
      id: newFormFieldId(),
      label: `${selected.label} copy`,
      options: selected.options?.map((option) => ({
        ...option,
        value: newFormFieldId(),
      })),
      visibleWhen: null,
    };
    markDirty(insertFieldAfter(fields, selected.id, copy));
    setSelectedId(copy.id);
  }

  function deleteSelected() {
    if (!selectedId || !canEdit) return;
    const target = fields.find((field) => field.id === selectedId);
    if (target && isAnswerableFormField(target) && countAnswerable(fields) <= 1) {
      toast.error("Keep at least one question on the form");
      return;
    }
    if (target?.type === "section" && sectionCount <= 1) {
      toast.error("Keep at least one section");
      return;
    }
    const index = fields.findIndex((field) => field.id === selectedId);
    const next = fields
      .filter((field) => field.id !== selectedId)
      .map((field) =>
        field.visibleWhen?.fieldId === selectedId
          ? { ...field, visibleWhen: null }
          : field,
      );
    markDirty(next);
    const fallback = next[Math.max(0, index - 1)] ?? next[0] ?? null;
    setSelectedId(fallback?.id ?? null);
    setInspectorSheetOpen(false);
  }
  deleteSelectedRef.current = deleteSelected;

  function focusSection(sectionId: string) {
    if (suppressClickRef.current) return;
    if (sectionId !== "__intro__") selectField(sectionId);
    const el = canvasRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    setLeftSheetOpen(false);
  }

  function clearDragState() {
    draggingFieldRef.current = null;
    draggingSectionRef.current = null;
    draggingLibraryRef.current = null;
    setDraggingFieldId(null);
    setDraggingSectionId(null);
    setDraggingLibraryType(null);
    setDropTarget(null);
    suppressClickRef.current = true;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  }

  function onLibraryDragStart(event: DragEvent, type: FormFieldType) {
    if (!canEdit) return;
    event.dataTransfer.setData(LIBRARY_DRAG_MIME, type);
    event.dataTransfer.setData("text/plain", type);
    event.dataTransfer.effectAllowed = "copy";
    setTransparentDragImage(event);
    draggingLibraryRef.current = type;
    draggingFieldRef.current = null;
    draggingSectionRef.current = null;
    setDraggingLibraryType(type);
    setDraggingFieldId(null);
    setDraggingSectionId(null);
  }

  function onFieldDragStart(event: DragEvent, id: string) {
    if (!canEdit) return;
    event.dataTransfer.setData(FIELD_DRAG_MIME, id);
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
    setTransparentDragImage(event);
    draggingFieldRef.current = id;
    draggingSectionRef.current = null;
    draggingLibraryRef.current = null;
    setDraggingFieldId(id);
    setDraggingSectionId(null);
    setDraggingLibraryType(null);
  }

  function onSectionDragStart(event: DragEvent, sectionId: string) {
    if (!canEdit || sectionId === "__intro__") return;
    event.dataTransfer.setData(SECTION_DRAG_MIME, sectionId);
    event.dataTransfer.setData("text/plain", sectionId);
    event.dataTransfer.effectAllowed = "move";
    setTransparentDragImage(event);
    draggingSectionRef.current = sectionId;
    draggingFieldRef.current = null;
    draggingLibraryRef.current = null;
    setDraggingSectionId(sectionId);
    setDraggingFieldId(null);
    setDraggingLibraryType(null);
  }

  function activeFieldDrag() {
    return draggingFieldRef.current;
  }

  function activeLibraryDrag() {
    return draggingLibraryRef.current;
  }

  function activeSectionDrag() {
    return draggingSectionRef.current;
  }

  function onFieldDragOver(event: DragEvent, id: string) {
    if (activeSectionDrag()) return;
    const fieldId = activeFieldDrag();
    const libraryType = activeLibraryDrag();
    if (!fieldId && !libraryType) return;
    if (fieldId === id) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = libraryType ? "copy" : "move";
    const intent = getFieldDropIntent(event, event.currentTarget as HTMLElement);
    setDropTarget((current) =>
      current?.kind === "field" &&
      current.id === id &&
      current.position === intent.position &&
      current.axis === intent.axis
        ? current
        : { kind: "field", id, position: intent.position, axis: intent.axis },
    );
  }

  function placeLibraryAt(
    type: FormFieldType,
    target: DropTarget,
  ): { fields: FormFieldDef[]; selectId: string } | null {
    if (fields.length >= 60) {
      toast.error("Forms can have at most 60 fields");
      return null;
    }
    const field = buildFormField(type);
    if (type === "section") {
      if (target.kind === "section") {
        return {
          fields: insertFieldRelative(fields, field, target.id, target.position),
          selectId: field.id,
        };
      }
      if (target.kind === "section-body") {
        if (target.sectionId === "__intro__") {
          return { fields: [field, ...fields], selectId: field.id };
        }
        const rangeEnd = (() => {
          const start = fields.findIndex((item) => item.id === target.sectionId);
          if (start < 0) return fields.length;
          let end = start + 1;
          while (end < fields.length && fields[end]!.type !== "section") end += 1;
          return end;
        })();
        const next = [...fields];
        next.splice(rangeEnd, 0, field);
        return { fields: next, selectId: field.id };
      }
      // relative to a field → insert section marker after that field's section block is odd;
      // insert immediately before/after the field as a divider
      return {
        fields: insertFieldRelative(fields, field, target.id, target.position),
        selectId: field.id,
      };
    }

    if (target.kind === "field") {
      return {
        fields: insertFieldRelative(fields, field, target.id, target.position),
        selectId: field.id,
      };
    }
    if (target.kind === "section-body") {
      return {
        fields: insertFieldAtSectionEnd(fields, target.sectionId, field),
        selectId: field.id,
      };
    }
    // Dropped on section reorder target while dragging a field type — append into that section
    return {
      fields: insertFieldAtSectionEnd(fields, target.id, field),
      selectId: field.id,
    };
  }

  function onFieldDrop(event: DragEvent, id: string) {
    event.preventDefault();
    event.stopPropagation();
    const libraryType =
      activeLibraryDrag() ||
      (isLibraryType(event.dataTransfer.getData(LIBRARY_DRAG_MIME))
        ? (event.dataTransfer.getData(LIBRARY_DRAG_MIME) as FormFieldType)
        : null);
    const fieldId =
      activeFieldDrag() ||
      event.dataTransfer.getData(FIELD_DRAG_MIME) ||
      (!libraryType ? event.dataTransfer.getData("text/plain") : "");
    const target: DropTarget =
      dropTarget?.kind === "field" && dropTarget.id === id
        ? dropTarget
        : { kind: "field", id, position: "after", axis: "y" };
    clearDragState();
    if (!canEdit) return;

    if (libraryType) {
      const placed = placeLibraryAt(libraryType, target);
      if (!placed) return;
      markDirty(placed.fields);
      setSelectedId(placed.selectId);
      revealInspector();
      return;
    }

    if (!fieldId || fieldId === id) return;
    markDirty(moveFieldInList(fields, fieldId, target.id, target.position));
  }

  function onSectionBodyDragOver(event: DragEvent, sectionId: string) {
    if (activeSectionDrag()) return;
    if (!activeFieldDrag() && !activeLibraryDrag()) return;

    // Only accept drops on explicit empty/end zones — not grid gaps between fields
    // (otherwise reorders get yanked to the end of the section).
    const zone = (event.target as HTMLElement | null)?.closest?.("[data-section-drop-zone]");
    if (!zone) return;

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = activeLibraryDrag() ? "copy" : "move";
    setDropTarget((current) =>
      current?.kind === "section-body" && current.sectionId === sectionId
        ? current
        : { kind: "section-body", sectionId },
    );
  }

  function onSectionBodyDrop(event: DragEvent, sectionId: string) {
    const zone = (event.target as HTMLElement | null)?.closest?.("[data-section-drop-zone]");
    if (!zone) return;

    event.preventDefault();
    event.stopPropagation();
    const libraryType =
      activeLibraryDrag() ||
      (isLibraryType(event.dataTransfer.getData(LIBRARY_DRAG_MIME))
        ? (event.dataTransfer.getData(LIBRARY_DRAG_MIME) as FormFieldType)
        : null);
    const fieldId =
      activeFieldDrag() ||
      event.dataTransfer.getData(FIELD_DRAG_MIME) ||
      (!libraryType ? event.dataTransfer.getData("text/plain") : "");
    const target: DropTarget = { kind: "section-body", sectionId };
    clearDragState();
    if (!canEdit) return;

    if (libraryType) {
      const placed = placeLibraryAt(libraryType, target);
      if (!placed) return;
      markDirty(placed.fields);
      setSelectedId(placed.selectId);
      revealInspector();
      return;
    }

    if (!fieldId) return;
    // Move existing field to end of this section
    const lastInSection = (() => {
      const group = sections.find((section) => section.id === sectionId);
      return group?.fields[group.fields.length - 1]?.id ?? null;
    })();
    if (lastInSection) {
      markDirty(moveFieldInList(fields, fieldId, lastInSection, "after"));
    } else if (sectionId !== "__intro__") {
      // Empty section: place right after section marker
      markDirty(moveFieldInList(fields, fieldId, sectionId, "after"));
    } else {
      const firstSection = fields.find((field) => field.type === "section");
      if (firstSection) {
        markDirty(moveFieldInList(fields, fieldId, firstSection.id, "before"));
      }
    }
  }

  function onSectionDragOver(event: DragEvent, sectionId: string) {
    const activeId = activeSectionDrag();
    if (!activeId || sectionId === "__intro__" || activeId === sectionId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    setDropTarget((current) =>
      current?.kind === "section" && current.id === sectionId && current.position === position
        ? current
        : { kind: "section", id: sectionId, position },
    );
  }

  function onSectionDrop(event: DragEvent, sectionId: string) {
    event.preventDefault();
    const activeId =
      activeSectionDrag() ||
      event.dataTransfer.getData(SECTION_DRAG_MIME) ||
      event.dataTransfer.getData("text/plain");
    const target =
      dropTarget?.kind === "section" && dropTarget.id === sectionId
        ? dropTarget
        : { kind: "section" as const, id: sectionId, position: "after" as const };
    clearDragState();
    if (!canEdit || !activeId || activeId === sectionId || sectionId === "__intro__") return;
    markDirty(moveSectionBlock(fields, activeId, target.id, target.position));
  }

  function nudgeSection(sectionId: string, offset: -1 | 1) {
    if (!canEdit || sectionId === "__intro__") return;
    markDirty(moveSectionByOffset(fields, sectionId, offset));
  }

  async function copyShareLink(token: string) {
    const url = `${window.location.origin}/f/${token}`;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } else {
      toast.success("Form shared", { description: url });
    }
  }

  async function handleShare() {
    if (status === "SENT" && publicToken) {
      await copyShareLink(publicToken);
      return;
    }
    if (status === "COMPLETED" || status === "CANCELLED") return;

    const saved = await persist({ silent: true });
    if (!saved) return;
    setSharing(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/forms/${formId}/share`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Failed to share");
      setStatus(body.form?.status ?? "SENT");
      const token = (body.form?.publicToken as string | undefined) ?? null;
      setPublicToken(token);
      if (token) await copyShareLink(token);
      else toast.success("Form shared");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not share form");
    } finally {
      setSharing(false);
    }
  }

  function handleBack() {
    if (dirty && !window.confirm("You have unsaved changes. Leave without saving?")) {
      return;
    }
    router.push(`/projects/${projectId}`);
  }

  const leftPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
          Outline
        </p>
        <div className="space-y-0.5">
          {sections.map((section) => {
            const isReal = section.id !== "__intro__";
            const sectionIndex = isReal ? realSectionIds.indexOf(section.id) : -1;
            const active =
              selectedId === section.id ||
              (isReal && section.fields.some((field) => field.id === selectedId));
            const dropBefore =
              dropTarget?.kind === "section" &&
              dropTarget.id === section.id &&
              dropTarget.position === "before";
            const dropAfter =
              dropTarget?.kind === "section" &&
              dropTarget.id === section.id &&
              dropTarget.position === "after";

            return (
              <div key={section.id} className="relative">
                {dropBefore ? <DropLine /> : null}
                <div
                  draggable={isReal && canEdit}
                  onDragStart={
                    isReal ? (event) => onSectionDragStart(event, section.id) : undefined
                  }
                  onDragEnd={clearDragState}
                  onDragOver={
                    isReal ? (event) => onSectionDragOver(event, section.id) : undefined
                  }
                  onDrop={isReal ? (event) => onSectionDrop(event, section.id) : undefined}
                  onClick={() => focusSection(section.id)}
                  className={cn(
                    "group/outline flex cursor-pointer items-center gap-0.5 rounded-md transition-colors",
                    isReal && canEdit && "cursor-grab active:cursor-grabbing",
                    active ? "bg-foreground/6" : "hover:bg-muted/70",
                    draggingSectionId === section.id && "opacity-35",
                  )}
                >
                  {isReal ? (
                    <span className="flex size-7 shrink-0 items-center justify-center text-muted-foreground/40">
                      <GripVerticalIcon className="size-3.5" />
                    </span>
                  ) : (
                    <span className="size-7 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1 truncate py-2 pr-1 text-left text-sm font-medium text-foreground">
                    {section.title}
                  </span>
                  <span className="pr-1 text-xs tabular-nums text-muted-foreground">
                    {section.fields.length}
                  </span>
                  {isReal && canEdit ? (
                    <div
                      className="mr-0.5 flex shrink-0 opacity-0 transition-opacity group-hover/outline:opacity-100 focus-within:opacity-100"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        disabled={sectionIndex <= 0}
                        onClick={() => nudgeSection(section.id, -1)}
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move section up"
                      >
                        <ChevronUpIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={sectionIndex < 0 || sectionIndex >= realSectionIds.length - 1}
                        onClick={() => nudgeSection(section.id, 1)}
                        className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                        aria-label="Move section down"
                      >
                        <ChevronDownIcon className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </div>
                {dropAfter ? <DropLine /> : null}
              </div>
            );
          })}
        </div>

        <div className="my-3.5 h-px bg-border/80" />

        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
          Fields
        </p>
        <p className="px-2 pb-2 text-xs leading-snug text-muted-foreground">
          Drag onto the canvas, or click to add
        </p>
        <div className="space-y-0.5">
          {FIELD_LIBRARY.map((item) => (
            <button
              key={item.type}
              type="button"
              disabled={!canEdit}
              draggable={canEdit}
              onDragStart={(event) => onLibraryDragStart(event, item.type)}
              onDragEnd={clearDragState}
              onClick={() => addField(item.type)}
              className={cn(
                "flex w-full cursor-grab items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm transition-colors active:cursor-grabbing",
                "text-muted-foreground hover:bg-muted/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45",
                draggingLibraryType === item.type && "opacity-40",
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-border/80 bg-background text-muted-foreground">
                {FIELD_ICONS[item.type]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground/90">{item.label}</span>
                <span className="block text-xs text-muted-foreground">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="my-3.5 h-px bg-border/80" />

        <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
          Templates
        </p>
        {templatesLoading ? (
          <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
            <Loader2Icon className="size-3.5 animate-spin" />
            Loading…
          </div>
        ) : templates.length === 0 ? (
          <p className="px-2 py-2 text-xs leading-relaxed text-muted-foreground">
            No templates yet. Save one from a form to reuse it here.
          </p>
        ) : (
          <div className="space-y-0.5">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                disabled={!canEdit}
                onClick={() => applyTemplate(template)}
                className="flex w-full flex-col rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/70 disabled:opacity-45"
              >
                <span className="truncate text-sm font-medium text-foreground">
                  {template.name}
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">
                  {countAnswerable(template.fields)} questions
                  {template.description ? ` · ${template.description}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const inspector = (
    <BuilderInspector
      field={selected}
      allFields={fields}
      disabled={!canEdit}
      onChange={updateSelected}
      onDuplicate={duplicateSelected}
      onDelete={deleteSelected}
    />
  );

  const saveHint =
    saveState === "saved" && !dirty
      ? "Saved"
      : dirty
        ? "Unsaved"
        : saving
          ? "Saving…"
          : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 lg:hidden"
            onClick={() => setLeftSheetOpen(true)}
            aria-label="Open outline"
          >
            <PanelLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 shrink-0 lg:inline-flex"
            onClick={() => setLeftDocked((open) => !open)}
            aria-label={leftDocked ? "Hide tools" : "Show tools"}
            aria-pressed={leftDocked}
          >
            <PanelLeftIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={handleBack}
            aria-label="Back to project"
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <input
              value={name}
              disabled={status === "CANCELLED" || status === "COMPLETED"}
              onChange={(event) => {
                beginMetaHistory();
                setName(event.target.value);
                bumpDirty();
                replaceCurrent({
                  name: event.target.value,
                  description,
                  thankYouMessage,
                  fields,
                });
              }}
              onBlur={() => finishMetaHistory()}
              className="w-full truncate bg-transparent text-sm font-semibold tracking-tight outline-none placeholder:text-muted-foreground"
              placeholder="Form name"
            />
            <p className="truncate text-[11px] text-muted-foreground">
              {projectName}
              {templateName ? ` · ${templateName}` : ""}
            </p>
          </div>
          <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex">
            {statusLabel(status)}
          </Badge>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {saveHint ? (
            <span
              className={cn(
                "hidden text-[11px] md:inline",
                dirty ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
              )}
            >
              {saveHint}
            </span>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 xl:hidden"
            onClick={() => setInspectorSheetOpen(true)}
            aria-label="Field settings"
          >
            <PanelRightIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden size-8 xl:inline-flex"
            onClick={() => setRightDocked((open) => !open)}
            aria-label={rightDocked ? "Hide inspector" : "Show inspector"}
            aria-pressed={rightDocked}
          >
            <PanelRightIcon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={!canUndo}
            onClick={() => {
              const snapshot = undo();
              if (snapshot) applyHistorySnapshot(snapshot);
            }}
            aria-label="Undo"
            title="Undo (Ctrl/Cmd+Z)"
          >
            <Undo2Icon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            disabled={!canRedo}
            onClick={() => {
              const snapshot = redo();
              if (snapshot) applyHistorySnapshot(snapshot);
            }}
            aria-label="Redo"
            title="Redo (Ctrl/Cmd+Shift+Z)"
          >
            <Redo2Icon className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden h-8 sm:inline-flex"
            onClick={() => setResponsesOpen(true)}
          >
            <ClipboardListIcon className="size-3.5" />
            Responses
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden h-8 sm:inline-flex"
            onClick={() => setPreviewOpen(true)}
          >
            <EyeIcon className="size-3.5" />
            Preview
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={saving}
            onClick={() => void persist()}
          >
            {saving ? <Loader2Icon className="size-3.5 animate-spin" /> : <SaveIcon className="size-3.5" />}
            <span className="hidden sm:inline">Save</span>
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={
              sharing ||
              status === "COMPLETED" ||
              status === "CANCELLED" ||
              (canEdit && answerableCount === 0)
            }
            onClick={() => void handleShare()}
          >
            {sharing ? <Loader2Icon className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
            <span className="hidden sm:inline">
              {status === "SENT" ? "Copy link" : "Share"}
            </span>
          </Button>
        </div>
      </header>

      {!canEdit ? (
        <div className="border-b border-border bg-muted/50 px-4 py-2 text-xs text-muted-foreground">
          This form is {status === "SENT" ? "shared" : status.toLowerCase()} — questions are locked.
          You can still rename it and preview.
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden min-h-0 shrink-0 overflow-hidden border-border/80 bg-muted/25 transition-[width,opacity,border-color] duration-200 ease-out lg:block",
            leftDocked
              ? "w-[248px] border-r opacity-100"
              : "w-0 border-r-0 opacity-0 pointer-events-none",
          )}
          aria-hidden={!leftDocked}
        >
          <div className="flex h-full w-[248px] flex-col">{leftPanel}</div>
        </aside>

        <main ref={canvasRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-background">
          <div className="mx-auto w-full max-w-[75rem] px-4 py-8 sm:px-8 sm:py-10">
            <header className="pb-6">
              {editingTitle ? (
                <input
                  autoFocus
                  value={name}
                  disabled={status === "CANCELLED" || status === "COMPLETED"}
                  onChange={(event) => {
                    beginMetaHistory();
                    setName(event.target.value);
                    bumpDirty();
                    replaceCurrent({
                      name: event.target.value,
                      description,
                      thankYouMessage,
                      fields,
                    });
                  }}
                  onBlur={() => {
                    finishMetaHistory();
                    setEditingTitle(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      finishMetaHistory();
                      setEditingTitle(false);
                    }
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishMetaHistory();
                      setEditingTitle(false);
                    }
                  }}
                  className="w-full bg-transparent text-2xl font-semibold tracking-tight outline-none ring-1 ring-primary/30 rounded-md px-2 py-1 -mx-2 sm:text-[1.7rem]"
                  placeholder="Untitled form"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "CANCELLED" && status !== "COMPLETED") {
                      setEditingTitle(true);
                    }
                  }}
                  className={cn(
                    "w-full rounded-md px-2 py-1 -mx-2 text-left text-2xl font-semibold tracking-tight sm:text-[1.7rem]",
                    status !== "CANCELLED" &&
                      status !== "COMPLETED" &&
                      "hover:bg-muted/40 cursor-text",
                  )}
                >
                  {name.trim() || "Untitled form"}
                </button>
              )}
              {editingDescription ? (
                <textarea
                  autoFocus
                  value={description}
                  disabled={status === "CANCELLED" || status === "COMPLETED"}
                  rows={3}
                  onChange={(event) => {
                    beginMetaHistory();
                    setDescription(event.target.value);
                    bumpDirty();
                    replaceCurrent({
                      name,
                      description: event.target.value,
                      thankYouMessage,
                      fields,
                    });
                  }}
                  onBlur={() => {
                    finishMetaHistory();
                    setEditingDescription(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishMetaHistory();
                      setEditingDescription(false);
                    }
                  }}
                  className="mt-2 w-full max-w-2xl resize-y rounded-md bg-transparent px-2 py-1 -mx-2 text-sm leading-relaxed text-muted-foreground outline-none ring-1 ring-primary/30"
                  placeholder={DEFAULT_FORM_DESCRIPTION}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "CANCELLED" && status !== "COMPLETED") {
                      setEditingDescription(true);
                    }
                  }}
                  className={cn(
                    "mt-2 max-w-2xl rounded-md px-2 py-1 -mx-2 text-left text-sm leading-relaxed text-muted-foreground",
                    status !== "CANCELLED" &&
                      status !== "COMPLETED" &&
                      "hover:bg-muted/40 cursor-text",
                  )}
                >
                  {description.trim() || DEFAULT_FORM_DESCRIPTION}
                </button>
              )}
              <p className="mt-3 px-2 -mx-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground/80">
                Thank-you message (after submit)
              </p>
              {editingThankYou ? (
                <textarea
                  autoFocus
                  value={thankYouMessage}
                  disabled={status === "CANCELLED" || status === "COMPLETED"}
                  rows={2}
                  onChange={(event) => {
                    beginMetaHistory();
                    setThankYouMessage(event.target.value);
                    bumpDirty();
                    replaceCurrent({
                      name,
                      description,
                      thankYouMessage: event.target.value,
                      fields,
                    });
                  }}
                  onBlur={() => {
                    finishMetaHistory();
                    setEditingThankYou(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      event.preventDefault();
                      finishMetaHistory();
                      setEditingThankYou(false);
                    }
                  }}
                  className="mt-1 w-full max-w-2xl resize-y rounded-md bg-transparent px-2 py-1 -mx-2 text-sm leading-relaxed text-muted-foreground outline-none ring-1 ring-primary/30"
                  placeholder="Thanks — we’ll be in touch soon."
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (status !== "CANCELLED" && status !== "COMPLETED") {
                      setEditingThankYou(true);
                    }
                  }}
                  className={cn(
                    "mt-1 max-w-2xl rounded-md px-2 py-1 -mx-2 text-left text-sm leading-relaxed text-muted-foreground",
                    status !== "CANCELLED" &&
                      status !== "COMPLETED" &&
                      "hover:bg-muted/40 cursor-text",
                  )}
                >
                  {thankYouMessage.trim() || "Thanks — we’ll be in touch soon."}
                </button>
              )}
            </header>

            <div
              className={cn(
                "border-t border-border",
                isPaletteDragging && "ring-1 ring-inset ring-primary/15",
              )}
            >
              {sections.map((section) => {
                const isReal = section.id !== "__intro__";
                const sectionSelected = isReal && selectedId === section.id;
                const sectionIndex = isReal ? realSectionIds.indexOf(section.id) : -1;
                const bodyActive =
                  dropTarget?.kind === "section-body" && dropTarget.sectionId === section.id;
                const empty = section.fields.length === 0;

                return (
                  <section
                    key={section.id}
                    data-section-id={section.id}
                    className={cn(
                      "grid gap-6 border-b border-border py-8 last:border-b-0 sm:gap-8 lg:grid-cols-[13.75rem_minmax(0,1fr)] lg:gap-11",
                      draggingSectionId === section.id && "opacity-40",
                    )}
                  >
                    <div className="min-w-0">
                      <div
                        className={cn(
                          "-m-1 rounded-lg border border-transparent p-1 transition-colors",
                          sectionSelected && "border-primary/40 bg-primary/5",
                          !sectionSelected && isReal && "hover:bg-muted/30",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (isReal) selectField(section.id);
                          }}
                          className="w-full text-left"
                        >
                          <h2 className="text-sm font-semibold tracking-tight">{section.title}</h2>
                          {section.description ? (
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                              {section.description}
                            </p>
                          ) : null}
                        </button>
                        {isReal && canEdit ? (
                          <div className="mt-2 flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={sectionIndex <= 0}
                              onClick={() => nudgeSection(section.id, -1)}
                              aria-label="Move section up"
                            >
                              <ChevronUpIcon className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={
                                sectionIndex < 0 || sectionIndex >= realSectionIds.length - 1
                              }
                              onClick={() => nudgeSection(section.id, 1)}
                              aria-label="Move section down"
                            >
                              <ChevronDownIcon className="size-3.5" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      className={cn(
                        "min-w-0 rounded-lg transition-colors",
                        (isPaletteDragging || isReordering) &&
                          "outline outline-1 outline-dashed outline-border/80",
                        bodyActive && "bg-primary/5 outline-primary/40",
                      )}
                      onDragOver={(event) => onSectionBodyDragOver(event, section.id)}
                      onDrop={(event) => onSectionBodyDrop(event, section.id)}
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3.5 sm:gap-y-3">
                        {section.fields.map((field) => {
                          const full = !isHalfWidthField(field);
                          const selectedField = field.id === selectedId;
                          const fieldDrop =
                            dropTarget?.kind === "field" && dropTarget.id === field.id
                              ? dropTarget
                              : null;
                          const insertAfterActive =
                            fieldDrop?.position === "after" && fieldDrop.axis === "y";

                          return (
                            <div
                              key={field.id}
                              className={cn(
                                "group/field relative",
                                full && "sm:col-span-2",
                                full && canEdit && "pb-2",
                              )}
                              onDragOver={(event) => onFieldDragOver(event, field.id)}
                              onDrop={(event) => onFieldDrop(event, field.id)}
                            >
                              {fieldDrop && !(full && insertAfterActive) ? (
                                <DropEdge
                                  position={fieldDrop.position}
                                  axis={fieldDrop.axis}
                                />
                              ) : null}
                              <div
                                role="button"
                                tabIndex={0}
                                draggable={canEdit}
                                onDragStart={(event) => onFieldDragStart(event, field.id)}
                                onDragEnd={clearDragState}
                                onClick={() => selectField(field.id)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    selectField(field.id);
                                  }
                                }}
                                className={cn(
                                  "group relative cursor-pointer rounded-lg border border-transparent p-2.5 transition-colors",
                                  canEdit && "cursor-grab active:cursor-grabbing",
                                  selectedField && "border-primary/40 bg-primary/5",
                                  !selectedField && "hover:border-border hover:bg-muted/30",
                                  draggingFieldId === field.id && "opacity-35",
                                )}
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {field.label}
                                    {field.required ? (
                                      <span className="text-destructive"> *</span>
                                    ) : null}
                                  </span>
                                  <GripVerticalIcon
                                    className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-hidden
                                  />
                                </div>
                                <FieldPreview field={field} />
                              </div>

                              {full && canEdit ? (
                                <div
                                  className={cn(
                                    "absolute inset-x-0 bottom-0 z-20 flex h-5 translate-y-1/2 items-center transition-opacity",
                                    insertAfterActive
                                      ? "opacity-100"
                                      : isReordering
                                        ? "opacity-0"
                                        : "opacity-0 group-hover/field:opacity-100",
                                    draggingFieldId === field.id && "opacity-0",
                                  )}
                                  onDragOver={(event) => {
                                    if (activeSectionDrag()) return;
                                    if (!activeFieldDrag() && !activeLibraryDrag()) return;
                                    if (activeFieldDrag() === field.id) return;
                                    event.preventDefault();
                                    event.stopPropagation();
                                    event.dataTransfer.dropEffect = activeLibraryDrag()
                                      ? "copy"
                                      : "move";
                                    setDropTarget({
                                      kind: "field",
                                      id: field.id,
                                      position: "after",
                                      axis: "y",
                                    });
                                  }}
                                  onDrop={(event) => onFieldDrop(event, field.id)}
                                >
                                  <div
                                    className={cn(
                                      "flex h-full w-full items-center gap-2",
                                      insertAfterActive && "[&>span:first-child]:bg-primary [&>span:last-child]:bg-primary",
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "h-px min-w-0 flex-1 rounded-full transition-colors",
                                        insertAfterActive ? "bg-primary" : "bg-border",
                                      )}
                                    />
                                    <button
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        addField("text", undefined, field.id);
                                      }}
                                      className={cn(
                                        "inline-flex shrink-0 items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium shadow-sm transition-colors",
                                        insertAfterActive
                                          ? "border-primary/40 text-primary"
                                          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground",
                                      )}
                                    >
                                      <PlusIcon className="size-3" />
                                      Add field
                                    </button>
                                    <span
                                      className={cn(
                                        "h-px min-w-0 flex-1 rounded-full transition-colors",
                                        insertAfterActive ? "bg-primary" : "bg-border",
                                      )}
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>

                      {empty && canEdit ? (
                        <div
                          data-section-drop-zone
                          className={cn(
                            "flex min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-3 py-6 text-center transition-colors",
                            bodyActive
                              ? "border-primary/50 bg-primary/5 text-primary"
                              : "border-border/80 text-muted-foreground",
                          )}
                        >
                          <p className="text-sm font-medium">
                            {bodyActive ? "Drop to add here" : "Drop a field here"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Or click a field type in the sidebar
                          </p>
                        </div>
                      ) : null}

                      {canEdit && !empty ? (
                        <button
                          type="button"
                          data-section-drop-zone
                          onClick={() => addField("text", section.id)}
                          className={cn(
                            "mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-medium transition-colors",
                            bodyActive
                              ? "border-primary/50 bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:text-primary",
                          )}
                        >
                          <PlusIcon className="size-3.5" />
                          {bodyActive ? "Drop to add here" : "Add field"}
                        </button>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>

            {sections.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-4 py-16 text-center">
                <p className="text-sm font-medium">Start building</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Drag a field from the left, or pick a template.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button type="button" size="sm" onClick={() => addField("section")}>
                    Add section
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => addField("text")}>
                    Add question
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </main>

        <aside
          className={cn(
            "hidden min-h-0 shrink-0 overflow-hidden border-border/80 bg-muted/15 transition-[width,opacity,border-color] duration-200 ease-out xl:block",
            rightDocked
              ? "w-[300px] border-l opacity-100"
              : "w-0 border-l-0 opacity-0 pointer-events-none",
          )}
          aria-hidden={!rightDocked}
        >
          <div className="flex h-full w-[300px] flex-col">{inspector}</div>
        </aside>
      </div>

      <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
        <SheetContent side="left" className="w-[min(20rem,100vw)] p-0">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Outline & fields</SheetTitle>
          </SheetHeader>
          {leftPanel}
        </SheetContent>
      </Sheet>

      <Sheet open={inspectorSheetOpen} onOpenChange={setInspectorSheetOpen}>
        <SheetContent side="right" className="w-[min(22rem,100vw)] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Field settings</SheetTitle>
          </SheetHeader>
          {inspector}
        </SheetContent>
      </Sheet>

      <Sheet open={responsesOpen} onOpenChange={setResponsesOpen}>
        <SheetContent side="right" className="flex w-[min(28rem,100vw)] flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle>Responses</SheetTitle>
            <SheetDescription>
              Submissions for this form. Create an estimate from any response.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {responsesLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2Icon className="size-4 animate-spin" />
                Loading responses…
              </div>
            ) : !responsesDetail || responsesDetail.submissions.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No responses yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {responsesDetail.submissions.map((submission) => {
                  const answerable = responsesDetail.fields.filter(isAnswerableFormField);
                  const summary = answerable
                    .map((field) => {
                      const plain = formatFormAnswerPlain(
                        field,
                        submission.answers[field.id],
                      );
                      if (!plain) return null;
                      const short =
                        plain.length > 80 ? `${plain.slice(0, 77)}…` : plain;
                      return `${field.label}: ${short}`;
                    })
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(" · ");
                  const who =
                    submission.submitterName?.trim() ||
                    submission.submitterEmail?.trim() ||
                    "Anonymous";
                  return (
                    <li
                      key={submission.id}
                      className="rounded-lg border border-border bg-muted/20 px-3 py-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">{who}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatDate(submission.submittedAt)}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 shrink-0"
                          onClick={() =>
                            router.push(
                              estimateFromSubmissionUrl({
                                projectId,
                                submissionId: submission.id,
                              }),
                            )
                          }
                        >
                          Estimate
                        </Button>
                      </div>
                      {summary ? (
                        <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {summary}
                        </p>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground">No answers captured.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Client preview</DialogTitle>
            <DialogDescription>
              Live layout with pages, conditionals, and branding. Submissions are not saved.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="pt-2">
            <PublicProjectForm
              token="preview"
              preview
              fields={fields}
              alreadySubmitted={false}
              formName={name.trim() || "Untitled form"}
              formDescription={description.trim() || DEFAULT_FORM_DESCRIPTION}
              thankYouMessage={thankYouMessage.trim() || null}
              brandColor={brandColor}
              logoUrl={logoUrl}
              logoBg={logoBg}
              companyName={companyName}
              projectName={projectName}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DropLine({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-primary",
        className,
      )}
      aria-hidden
    />
  );
}

function DropEdge({
  position,
  axis,
}: {
  position: "before" | "after";
  axis: "x" | "y";
}) {
  if (axis === "x") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 z-10 w-0.5 rounded-full bg-primary",
          position === "before" ? "left-0" : "right-0",
        )}
        aria-hidden
      />
    );
  }
  return (
    <DropLine className={position === "before" ? "-top-1.5" : "-bottom-1.5"} />
  );
}

function FieldPreview({ field }: { field: FormFieldDef }) {
  if (field.type === "page") {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Page break · {field.label}
      </div>
    );
  }

  if (field.type === "yesno") {
    return (
      <div className="flex gap-2">
        {["Yes", "No"].map((label) => (
          <div
            key={label}
            className="min-h-10 flex-1 rounded-md border border-border bg-muted/20 px-3 py-2 text-center text-sm text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <div className="space-y-1.5">
        {(field.options ?? []).slice(0, 3).map((option) => (
          <div
            key={option.value}
            className="flex items-center gap-2 rounded-md border border-border bg-muted/20 px-2.5 py-2 text-sm text-muted-foreground"
          >
            <span className="size-3.5 shrink-0 rounded-sm border border-border" />
            {option.label}
          </div>
        ))}
      </div>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {(field.options ?? []).slice(0, 3).map((option) => (
          <div
            key={option.value}
            className="min-h-14 rounded-md border border-border bg-muted/20 px-2.5 py-2"
          >
            <p className="text-sm font-medium">{option.label}</p>
            {option.description ? (
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {option.description}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground",
        field.type === "textarea" || field.type === "images" ? "min-h-20" : "min-h-10",
      )}
    >
      {field.type === "phone"
        ? "Phone number"
        : field.type === "number"
          ? "0"
          : placeholderForField(field)}
    </div>
  );
}
