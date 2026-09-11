import { buildCustomFieldDisplayRows } from "@/lib/custom-fields";
import type {
  CustomFieldAppliesTo,
  CustomFieldDefinition,
} from "@/lib/schemas/custom-fields";
import { cn } from "@/lib/utils";

type DocumentCustomFieldsDisplayProps = {
  kind: CustomFieldAppliesTo;
  definitions: CustomFieldDefinition[];
  values: unknown;
  className?: string;
};

export function DocumentCustomFieldsDisplay({
  kind,
  definitions,
  values,
  className,
}: DocumentCustomFieldsDisplayProps) {
  const rows = buildCustomFieldDisplayRows(definitions, kind, values);
  if (rows.length === 0) return null;

  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {rows.map((row) => (
        <div key={row.id} className={row.multiline ? "sm:col-span-2" : undefined}>
          <dt className="text-xs font-medium text-muted-foreground">{row.label}</dt>
          <dd
            className={cn(
              "mt-0.5 text-sm text-foreground",
              row.multiline && "whitespace-pre-wrap",
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
