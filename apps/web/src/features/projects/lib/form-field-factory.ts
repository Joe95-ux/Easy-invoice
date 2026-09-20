import { newFormFieldId } from "@/lib/project-form-ids";
import {
  isAnswerableFormField,
  type FormFieldDef,
  type FormFieldSectionGroup,
  type FormFieldType,
} from "@/lib/schemas/project-form";

export const FIELD_LIBRARY: Array<{
  type: FormFieldType;
  label: string;
  icon: string;
  hint: string;
}> = [
  { type: "text", label: "Short answer", icon: "T", hint: "Single-line text" },
  { type: "textarea", label: "Long answer", icon: "¶", hint: "Multi-line text" },
  { type: "email", label: "Email", icon: "@", hint: "Email address" },
  { type: "phone", label: "Phone", icon: "#", hint: "Phone number" },
  { type: "number", label: "Number", icon: "1", hint: "Numeric value" },
  { type: "url", label: "URL", icon: "↗", hint: "Website link" },
  { type: "date", label: "Date", icon: "◷", hint: "Pick a date" },
  { type: "select", label: "Dropdown", icon: "⌄", hint: "Choose one from a list" },
  { type: "radio", label: "Multiple choice", icon: "◉", hint: "Choice cards" },
  { type: "checkbox", label: "Checkboxes", icon: "☑", hint: "Choose one or more" },
  { type: "yesno", label: "Yes / No", icon: "Y", hint: "Binary choice" },
  { type: "images", label: "File upload", icon: "↥", hint: "Image uploads" },
  { type: "section", label: "Section", icon: "§", hint: "Group related questions" },
  { type: "page", label: "Page break", icon: "▦", hint: "Start a new step on the public form" },
];

export function fieldTypeLabel(type: FormFieldType): string {
  return FIELD_LIBRARY.find((item) => item.type === type)?.label ?? type;
}

function defaultOptions() {
  return [
    { value: "option_a", label: "Option A", description: "Optional detail" },
    { value: "option_b", label: "Option B", description: "Optional detail" },
    { value: "option_c", label: "Option C", description: "Optional detail" },
  ];
}

export function buildFormField(type: FormFieldType): FormFieldDef {
  const base: FormFieldDef = {
    id: newFormFieldId(),
    type,
    label:
      type === "section"
        ? "New section"
        : type === "page"
          ? "New page"
          : type === "yesno"
            ? "Yes or no?"
            : "New question",
    required: false,
  };
  if (type === "select" || type === "radio" || type === "checkbox") {
    base.options = defaultOptions();
  }
  if (type === "images") {
    base.maxFiles = 8;
  }
  if (type === "section") {
    base.description = "Short description for this section";
  } else if (type === "page") {
    base.description = "Shown as a step for the client";
  } else {
    base.width = defaultFieldWidth(type);
  }
  return base;
}

/** Default column span for types that never had an explicit `width`. */
export function defaultFieldWidth(type: FormFieldType): "half" | "full" {
  if (
    type === "text" ||
    type === "email" ||
    type === "url" ||
    type === "phone" ||
    type === "number" ||
    type === "date" ||
    type === "select" ||
    type === "yesno"
  ) {
    return "half";
  }
  return "full";
}

/** Half-width in the public fill UI and builder canvas. */
export function isHalfWidthField(field: FormFieldDef): boolean {
  if (field.type === "section" || field.type === "page") return false;
  return (field.width ?? defaultFieldWidth(field.type)) === "half";
}

export function resolvedFieldWidth(field: FormFieldDef): "half" | "full" {
  if (field.type === "section" || field.type === "page") return "full";
  return field.width ?? defaultFieldWidth(field.type);
}

/** Answerable types users can switch between in the inspector (not sections/pages). */
export const ANSWERABLE_FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "url",
  "date",
  "select",
  "radio",
  "checkbox",
  "yesno",
  "images",
];

/** Patch when changing a field’s type so options / maxFiles stay valid. */
export function patchForFieldTypeChange(
  field: FormFieldDef,
  nextType: FormFieldType,
): Partial<FormFieldDef> {
  if (field.type === nextType || nextType === "section" || nextType === "page") return {};
  const patch: Partial<FormFieldDef> = {
    type: nextType,
    width: field.width ?? defaultFieldWidth(nextType),
  };
  if (nextType === "select" || nextType === "radio" || nextType === "checkbox") {
    patch.options =
      field.options && field.options.length > 0 ? field.options : defaultOptions();
  } else {
    patch.options = undefined;
  }
  if (nextType === "images") {
    patch.maxFiles = field.maxFiles ?? 8;
  } else {
    patch.maxFiles = undefined;
  }
  return patch;
}

export function placeholderForField(field: FormFieldDef): string {
  switch (field.type) {
    case "email":
      return "name@example.com";
    case "phone":
      return "+1 555 000 0000";
    case "number":
      return "0";
    case "url":
      return "https://";
    case "date":
      return "Select a date";
    case "select":
      return "Select an option";
    case "yesno":
      return "Yes / No";
    case "checkbox":
      return "Select all that apply";
    case "textarea":
      return field.description?.trim() || "Write your answer…";
    case "images":
      return `Upload up to ${field.maxFiles ?? 8} images`;
    default:
      return field.description?.trim() || "Your answer";
  }
}

/**
 * Group fields for the builder canvas. Keeps empty sections visible
 * (unlike the public fill helper, which drops empty groups).
 */
export function groupFieldsForBuilder(fields: FormFieldDef[]): FormFieldSectionGroup[] {
  const groups: FormFieldSectionGroup[] = [];
  let current: FormFieldSectionGroup | null = null;

  function ensureIntro() {
    if (!current) {
      current = {
        id: "__intro__",
        title: "Questions",
        description: "Add a section to organize this form.",
        fields: [],
      };
    }
  }

  for (const field of fields) {
    if (field.type === "section" || field.type === "page") {
      if (current) groups.push(current);
      current = {
        id: field.id,
        title: field.type === "page" ? `Page · ${field.label}` : field.label,
        description: field.description ?? null,
        fields: [],
      };
      continue;
    }
    ensureIntro();
    current!.fields.push(field);
  }

  if (current) groups.push(current);
  return groups;
}

export function countAnswerable(fields: FormFieldDef[]) {
  return fields.filter(isAnswerableFormField).length;
}

/** Fresh ids so applying a template never collides with prior field ids. */
export function cloneFieldsWithNewIds(fields: FormFieldDef[]): FormFieldDef[] {
  const idMap = new Map<string, string>();
  const optionValueMaps = new Map<string, Map<string, string>>();

  const cloned = fields.map((field) => {
    const newId = newFormFieldId();
    idMap.set(field.id, newId);
    const optionMap = new Map<string, string>();
    const options = field.options?.map((option) => {
      const newValue = newFormFieldId();
      optionMap.set(option.value, newValue);
      return { ...option, value: newValue };
    });
    if (optionMap.size > 0) optionValueMaps.set(field.id, optionMap);
    return {
      ...field,
      id: newId,
      options,
      validation: field.validation ? { ...field.validation } : field.validation,
      visibleWhen: field.visibleWhen ? { ...field.visibleWhen } : field.visibleWhen,
    };
  });

  return cloned.map((field) => {
    const rule = field.visibleWhen;
    if (!rule?.fieldId) return field;
    const nextFieldId = idMap.get(rule.fieldId);
    if (!nextFieldId) {
      return { ...field, visibleWhen: null };
    }
    let nextValue = rule.value;
    const optionMap = optionValueMaps.get(rule.fieldId);
    if (nextValue != null && optionMap?.has(nextValue)) {
      nextValue = optionMap.get(nextValue);
    }
    return {
      ...field,
      visibleWhen: {
        ...rule,
        fieldId: nextFieldId,
        ...(nextValue !== undefined ? { value: nextValue } : {}),
      },
    };
  });
}

/** Ensure the canvas has at least one section/page marker for layout. */
export function ensureBuilderSections(fields: FormFieldDef[]): {
  fields: FormFieldDef[];
  changed: boolean;
} {
  if (fields.some((field) => field.type === "section" || field.type === "page")) {
    return { fields, changed: false };
  }
  if (fields.length === 0) {
    return {
      fields: [
        {
          id: newFormFieldId(),
          type: "section",
          label: "Project basics",
          required: false,
          description: "Core details for this request.",
        },
      ],
      changed: true,
    };
  }
  return {
    fields: [
      {
        id: newFormFieldId(),
        type: "section",
        label: "Questions",
        required: false,
        description: "Details to collect from the client.",
      },
      ...fields,
    ],
    changed: true,
  };
}

export function moveFieldInList(
  fields: FormFieldDef[],
  fromId: string,
  targetId: string,
  position: "before" | "after",
): FormFieldDef[] {
  const fromIndex = fields.findIndex((field) => field.id === fromId);
  if (fromIndex < 0) return fields;
  const without = fields.filter((field) => field.id !== fromId);
  let targetIndex = without.findIndex((field) => field.id === targetId);
  if (targetIndex < 0) return fields;
  if (position === "after") targetIndex += 1;
  const next = [...without];
  next.splice(targetIndex, 0, fields[fromIndex]!);
  return next;
}

export function insertFieldAfter(
  fields: FormFieldDef[],
  afterId: string | null,
  field: FormFieldDef,
): FormFieldDef[] {
  if (!afterId) return [...fields, field];
  const index = fields.findIndex((item) => item.id === afterId);
  if (index < 0) return [...fields, field];
  const next = [...fields];
  next.splice(index + 1, 0, field);
  return next;
}

export function insertFieldRelative(
  fields: FormFieldDef[],
  field: FormFieldDef,
  targetId: string,
  position: "before" | "after",
): FormFieldDef[] {
  const targetIndex = fields.findIndex((item) => item.id === targetId);
  if (targetIndex < 0) return [...fields, field];
  const next = [...fields];
  next.splice(position === "before" ? targetIndex : targetIndex + 1, 0, field);
  return next;
}

export function insertFieldAtSectionEnd(
  fields: FormFieldDef[],
  sectionId: string,
  field: FormFieldDef,
): FormFieldDef[] {
  if (sectionId === "__intro__") {
    const firstSection = fields.findIndex(
      (item) => item.type === "section" || item.type === "page",
    );
    if (firstSection < 0) return [...fields, field];
    const next = [...fields];
    next.splice(firstSection, 0, field);
    return next;
  }

  const sectionIndex = fields.findIndex((item) => item.id === sectionId);
  if (sectionIndex < 0) return [...fields, field];

  let insertAt = sectionIndex + 1;
  while (
    insertAt < fields.length &&
    fields[insertAt]!.type !== "section" &&
    fields[insertAt]!.type !== "page"
  ) {
    insertAt += 1;
  }
  const next = [...fields];
  next.splice(insertAt, 0, field);
  return next;
}

/** Inclusive start, exclusive end of a section marker + its fields. */
export function getSectionBlockRange(
  fields: FormFieldDef[],
  sectionId: string,
): { start: number; end: number } | null {
  if (sectionId === "__intro__") {
    const firstSection = fields.findIndex(
      (item) => item.type === "section" || item.type === "page",
    );
    if (firstSection === 0) return null;
    return { start: 0, end: firstSection < 0 ? fields.length : firstSection };
  }
  const start = fields.findIndex(
    (item) =>
      item.id === sectionId && (item.type === "section" || item.type === "page"),
  );
  if (start < 0) return null;
  let end = start + 1;
  while (end < fields.length && fields[end]!.type !== "section" && fields[end]!.type !== "page") {
    end += 1;
  }
  return { start, end };
}

/** Move a whole section (marker + fields) before/after another section. */
export function moveSectionBlock(
  fields: FormFieldDef[],
  fromSectionId: string,
  toSectionId: string,
  position: "before" | "after",
): FormFieldDef[] {
  if (fromSectionId === toSectionId) return fields;
  if (fromSectionId === "__intro__" || toSectionId === "__intro__") return fields;

  const from = getSectionBlockRange(fields, fromSectionId);
  const to = getSectionBlockRange(fields, toSectionId);
  if (!from || !to) return fields;

  const block = fields.slice(from.start, from.end);
  const without = [...fields.slice(0, from.start), ...fields.slice(from.end)];

  const toStartInWithout = without.findIndex(
    (item) =>
      item.id === toSectionId && (item.type === "section" || item.type === "page"),
  );
  if (toStartInWithout < 0) return fields;

  let toRangeEnd = toStartInWithout + 1;
  while (
    toRangeEnd < without.length &&
    without[toRangeEnd]!.type !== "section" &&
    without[toRangeEnd]!.type !== "page"
  ) {
    toRangeEnd += 1;
  }

  const insertAt = position === "before" ? toStartInWithout : toRangeEnd;
  return [...without.slice(0, insertAt), ...block, ...without.slice(insertAt)];
}

export function moveSectionByOffset(
  fields: FormFieldDef[],
  sectionId: string,
  offset: -1 | 1,
): FormFieldDef[] {
  const sectionIds = fields
    .filter((field) => field.type === "section" || field.type === "page")
    .map((field) => field.id);
  const index = sectionIds.indexOf(sectionId);
  if (index < 0) return fields;
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= sectionIds.length) return fields;
  const targetId = sectionIds[targetIndex]!;
  return moveSectionBlock(fields, sectionId, targetId, offset < 0 ? "before" : "after");
}
