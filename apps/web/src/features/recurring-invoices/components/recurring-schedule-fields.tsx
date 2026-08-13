"use client";

import { Combobox } from "@/components/forms/combobox";
import { DatePicker } from "@/components/forms/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { frequencyLabel } from "@/lib/recurring-invoices-shared";
import type { RecurringFrequency } from "@easy-invoice/db";

export type RecurringScheduleFormState = {
  name: string;
  frequency: RecurringFrequency;
  interval: string;
  startDate: string;
  nextIssueDate: string;
  endDate: string;
  maxOccurrences: string;
  dueDaysAfterIssue: string;
  autoSend: boolean;
};

const UNIT_ITEMS: {
  value: RecurringFrequency;
  singular: string;
  plural: string;
}[] = [
  { value: "WEEKLY", singular: "week", plural: "weeks" },
  { value: "MONTHLY", singular: "month", plural: "months" },
  { value: "QUARTERLY", singular: "quarter", plural: "quarters" },
  { value: "YEARLY", singular: "year", plural: "years" },
];

export function intervalUnit(frequency: RecurringFrequency, interval: number): string {
  const unit = UNIT_ITEMS.find((item) => item.value === frequency);
  if (!unit) return "period";
  return interval === 1 ? unit.singular : unit.plural;
}

type RecurringScheduleFieldsProps = {
  value: RecurringScheduleFormState;
  onChange: (patch: Partial<RecurringScheduleFormState>) => void;
  /** Create flow uses start date as first issue; edit shows next issue separately. */
  showNextIssueDate?: boolean;
  canAutoSend: boolean;
  autoSendHint?: string;
  /** Portal target for popovers inside Vaul drawers. */
  popupContainer?: HTMLElement | null;
};

export function RecurringScheduleFields({
  value,
  onChange,
  showNextIssueDate = false,
  canAutoSend,
  autoSendHint,
  popupContainer = null,
}: RecurringScheduleFieldsProps) {
  const intervalNum = Number(value.interval) || 1;
  const cadenceHint = frequencyLabel(value.frequency, intervalNum);
  const unitOptions = UNIT_ITEMS.map((item) => ({
    value: item.value,
    label: intervalNum === 1 ? item.singular : item.plural,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="recurring-name">Schedule name</Label>
        <Input
          id="recurring-name"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Monthly retainer – Acme"
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-interval">Repeat every</Label>
        <div className="grid grid-cols-[5.5rem_1fr] gap-2">
          <Input
            id="recurring-interval"
            type="number"
            min={1}
            max={52}
            value={value.interval}
            onChange={(e) => onChange({ interval: e.target.value })}
            aria-label="Interval count"
          />
          <Combobox
            id="recurring-frequency"
            value={value.frequency}
            options={unitOptions}
            onChange={(next) => onChange({ frequency: next })}
            placeholder="Period"
            showSearch={false}
            container={popupContainer}
            aria-label="Repeat period"
            className="capitalize"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {cadenceHint}
          {intervalNum > 1
            ? ` — for example, every ${intervalNum} ${intervalUnit(value.frequency, intervalNum)}.`
            : "."}
        </p>
      </div>

      <div className={showNextIssueDate ? "grid gap-3 sm:grid-cols-2" : undefined}>
        <div className="space-y-2">
          <Label htmlFor="recurring-start">
            {showNextIssueDate ? "Start date" : "First issue date"}
          </Label>
          <DatePicker
            id="recurring-start"
            value={value.startDate}
            container={popupContainer}
            onChange={(startDate) => {
              onChange(
                showNextIssueDate
                  ? { startDate }
                  : { startDate, nextIssueDate: startDate },
              );
            }}
          />
        </div>
        {showNextIssueDate ? (
          <div className="space-y-2">
            <Label htmlFor="recurring-next">Next issue date</Label>
            <DatePicker
              id="recurring-next"
              value={value.nextIssueDate}
              container={popupContainer}
              onChange={(nextIssueDate) => onChange({ nextIssueDate })}
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recurring-end">End date (optional)</Label>
          <DatePicker
            id="recurring-end"
            value={value.endDate || undefined}
            placeholder="No end date"
            container={popupContainer}
            onChange={(endDate) => onChange({ endDate })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="recurring-max">Max invoices (optional)</Label>
          <Input
            id="recurring-max"
            type="number"
            min={1}
            value={value.maxOccurrences}
            onChange={(e) => onChange({ maxOccurrences: e.target.value })}
            placeholder="Unlimited"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurring-due-days">Payment due (days after issue)</Label>
        <Input
          id="recurring-due-days"
          type="number"
          min={0}
          value={value.dueDaysAfterIssue}
          onChange={(e) => onChange({ dueDaysAfterIssue: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Each generated invoice’s due date is this many days after its issue date.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[10px] border px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-medium">Auto-send</p>
          <p className="text-xs text-muted-foreground">
            {autoSendHint ??
              (canAutoSend
                ? "Email each invoice when it is generated."
                : "Client needs an email address to enable this.")}
          </p>
        </div>
        <Switch
          checked={value.autoSend}
          disabled={!canAutoSend}
          onCheckedChange={(checked) => {
            if (checked && !canAutoSend) return;
            onChange({ autoSend: checked });
          }}
        />
      </div>
    </div>
  );
}
