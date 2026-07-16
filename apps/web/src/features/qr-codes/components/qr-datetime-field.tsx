"use client";

import { DatePicker } from "@/components/forms/date-picker";
import {
  Field,
  FieldContent,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type QrDateTimeFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

const DEFAULT_TIME = "09:00";

function splitValue(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [date, time] = value.split("T");
  return { date: date ?? "", time: (time ?? "").slice(0, 5) };
}

export function QrDateTimeField({
  id,
  label,
  value,
  onChange,
  required,
}: QrDateTimeFieldProps) {
  const { date, time } = splitValue(value);

  function emit(nextDate: string, nextTime: string) {
    if (!nextDate) {
      onChange("");
      return;
    }
    onChange(`${nextDate}T${nextTime || DEFAULT_TIME}`);
  }

  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </FieldLabel>
      <FieldContent>
        <div className="flex gap-2">
          <DatePicker
            id={id}
            value={date || undefined}
            onChange={(nextDate) => emit(nextDate, time)}
            placeholder="Pick a date"
            className="flex-1"
          />
          <Input
            type="time"
            aria-label={`${label} time`}
            value={time}
            disabled={!date}
            onChange={(event) => emit(date, event.target.value)}
            className="w-[7.5rem]"
          />
        </div>
      </FieldContent>
    </Field>
  );
}
