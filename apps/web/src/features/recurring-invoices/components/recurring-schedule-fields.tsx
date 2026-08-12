"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const UNIT_ITEMS: { value: RecurringFrequency; label: string; singular: string; plural: string }[] =
  [
    { value: "WEEKLY", label: "Week", singular: "week", plural: "weeks" },
    { value: "MONTHLY", label: "Month", singular: "month", plural: "months" },
    { value: "QUARTERLY", label: "Quarter", singular: "quarter", plural: "quarters" },
    { value: "YEARLY", label: "Year", singular: "year", plural: "years" },
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
};

export function RecurringScheduleFields({
  value,
  onChange,
  showNextIssueDate = false,
  canAutoSend,
  autoSendHint,
}: RecurringScheduleFieldsProps) {
  const intervalNum = Number(value.interval) || 1;
  const cadenceHint = frequencyLabel(value.frequency, intervalNum);

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
          <Select
            value={value.frequency}
            onValueChange={(next) =>
              next && onChange({ frequency: next as RecurringFrequency })
            }
            items={UNIT_ITEMS.map((item) => ({
              value: item.value,
              label: intervalNum === 1 ? item.singular : item.plural,
            }))}
          >
            <SelectTrigger className="w-full capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNIT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="capitalize">
                  {intervalNum === 1 ? item.singular : item.plural}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <Input
            id="recurring-start"
            type="date"
            value={value.startDate}
            onChange={(e) => {
              const startDate = e.target.value;
              onChange(
                showNextIssueDate
                  ? { startDate }
                  : { startDate, nextIssueDate: startDate },
              );
            }}
            required
          />
        </div>
        {showNextIssueDate ? (
          <div className="space-y-2">
            <Label htmlFor="recurring-next">Next issue date</Label>
            <Input
              id="recurring-next"
              type="date"
              value={value.nextIssueDate}
              onChange={(e) => onChange({ nextIssueDate: e.target.value })}
              required
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="recurring-end">End date (optional)</Label>
          <Input
            id="recurring-end"
            type="date"
            value={value.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })}
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
