/**
 * Lightweight node:test suite for custom-field helpers.
 * Run: `npx tsx --test apps/web/src/lib/custom-fields.test.ts`
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCustomFieldDisplayRows,
  customFieldMergeTagKey,
  mergePreservedCustomFieldValues,
  prepareCustomFieldsForSave,
  sanitizeCustomFieldValuesForSave,
} from "./custom-fields";
import type { CustomFieldDefinition } from "./schemas/custom-fields";

const defs: CustomFieldDefinition[] = [
  {
    id: "po",
    label: "PO Number",
    description: null,
    type: "text",
    required: true,
    enabled: true,
    defaultValue: null,
    appliesTo: ["invoice", "estimate"],
    showOnPdf: true,
  },
  {
    id: "site",
    label: "Job Site",
    description: null,
    type: "text",
    required: false,
    enabled: false,
    defaultValue: null,
    appliesTo: ["invoice"],
    showOnPdf: true,
  },
];

describe("custom fields", () => {
  it("preserves disabled field values on merge", () => {
    const editable = sanitizeCustomFieldValuesForSave(defs, "invoice", {
      po: "PO-1",
    });
    assert.equal(editable.ok, true);
    if (!editable.ok) return;
    const merged = mergePreservedCustomFieldValues(defs, "invoice", editable.values, {
      po: "PO-OLD",
      site: "Warehouse A",
    });
    assert.equal(merged.po, "PO-1");
    assert.equal(merged.site, "Warehouse A");
  });

  it("prepare merges previous when provided", () => {
    const prepared = prepareCustomFieldsForSave(
      defs,
      "invoice",
      { po: "PO-9" },
      { previousValues: { site: "Dock 2" } },
    );
    assert.equal(prepared.ok, true);
    if (!prepared.ok) return;
    assert.equal(prepared.values.po, "PO-9");
    assert.equal(prepared.values.site, "Dock 2");
  });

  it("display rows keep label for disabled fields with values", () => {
    const rows = buildCustomFieldDisplayRows(defs, "invoice", {
      po: "PO-1",
      site: "Yard",
    });
    assert.ok(rows.some((row) => row.id === "site" && row.label === "Job Site"));
  });

  it("builds merge tag keys from labels", () => {
    assert.equal(customFieldMergeTagKey(defs[0]!), "custom_field_po_number");
  });

  it("validates email type", () => {
    const emailDefs: CustomFieldDefinition[] = [
      {
        ...defs[0]!,
        id: "contact",
        label: "Contact email",
        type: "email",
        required: false,
      },
    ];
    const bad = sanitizeCustomFieldValuesForSave(emailDefs, "invoice", {
      contact: "not-an-email",
    });
    assert.equal(bad.ok, false);
    const good = sanitizeCustomFieldValuesForSave(emailDefs, "invoice", {
      contact: "a@b.co",
    });
    assert.equal(good.ok, true);
  });
});
