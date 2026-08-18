import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover.js";

type DatePickerMode = "date" | "datetime";

type AppDatePickerFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  id?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  mode?: DatePickerMode;
  className?: string;
  triggerClassName?: string;
  labelClassName?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDatePart(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function extractTimePart(value: string): string {
  const match = /T(\d{2}:\d{2})/.exec(value);
  return match?.[1] ?? "";
}

function toDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayValue(value: string, mode: DatePickerMode): string {
  const date = parseDatePart(value);
  if (!date) return "";
  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
  const time = extractTimePart(value);
  return mode === "datetime" && time ? `${dateLabel}, ${time}` : dateLabel;
}

function isSameDay(left: Date | null, right: Date): boolean {
  return Boolean(
    left &&
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildCalendarDays(visibleMonth: Date): Date[] {
  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const start = new Date(firstOfMonth);
  start.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export function AppDatePickerField({
  value,
  onValueChange,
  label,
  id,
  required,
  error,
  disabled,
  placeholder = "Pick a date",
  ariaLabel,
  mode = "date",
  className = "",
  triggerClassName = "",
  labelClassName = ""
}: AppDatePickerFieldProps): JSX.Element {
  const selectedDate = parseDatePart(value);
  const [visibleMonth, setVisibleMonth] = useState<Date>(selectedDate ?? new Date());
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const selectedYear = selectedDate?.getFullYear();
  const selectedMonth = selectedDate?.getMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric"
  }).format(visibleMonth);
  const displayValue = formatDisplayValue(value, mode);
  const timeValue = extractTimePart(value) || "12:00";

  useEffect(() => {
    if (selectedYear !== undefined && selectedMonth !== undefined) {
      setVisibleMonth(new Date(selectedYear, selectedMonth, 1));
    }
  }, [selectedMonth, selectedYear]);

  const selectDate = (date: Date) => {
    const dateValue = toDateValue(date);
    onValueChange(mode === "datetime" ? `${dateValue}T${timeValue}` : dateValue);
  };

  const updateTime = (nextTime: string) => {
    const baseDate = selectedDate ?? new Date();
    onValueChange(`${toDateValue(baseDate)}T${nextTime}`);
  };

  return (
    <div className={className}>
      {label ? (
        <label
          htmlFor={id}
          className={`block text-[13px] font-semibold text-app-text ${labelClassName}`}
        >
          {label}
          {required ? <span className="text-app-error"> *</span> : null}
        </label>
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-label={ariaLabel ?? label}
            aria-invalid={error ? "true" : "false"}
            className={`flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-app-surface px-3 text-left text-sm font-semibold outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:opacity-50 ${
              label ? "mt-2" : ""
            } ${error ? "border-app-error" : "border-app-border"} ${triggerClassName}`}
          >
            <span className={displayValue ? "text-app-text" : "text-app-text-muted"}>
              {displayValue || placeholder}
            </span>
            <CalendarDays
              className="h-4 w-4 shrink-0 text-app-text-muted"
              aria-hidden="true"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(calc(100vw-2rem),20rem)] p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1)
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-sm font-black text-app-text">{monthLabel}</p>
            <button
              type="button"
              onClick={() =>
                setVisibleMonth(
                  new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1)
                )
              }
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-black text-app-text-muted">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {calendarDays.map((date) => {
              const inCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const selected = isSameDay(selectedDate, date);
              const today = isSameDay(new Date(), date);
              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => selectDate(date)}
                  className={`inline-flex h-9 items-center justify-center rounded-md text-sm font-bold transition ${
                    selected
                      ? "bg-app-primary text-app-primary-foreground"
                      : "text-app-text hover:bg-app-primary-soft hover:text-app-primary"
                  } ${inCurrentMonth ? "" : "opacity-45"} ${
                    today && !selected ? "ring-1 ring-app-focus/40" : ""
                  }`}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          {mode === "datetime" ? (
            <label className="mt-3 block text-xs font-bold text-app-text-muted">
              Time
              <input
                type="time"
                value={timeValue}
                onChange={(event) => updateTime(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm font-semibold text-app-text outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/30"
              />
            </label>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-app-border pt-3">
            <button
              type="button"
              onClick={() => selectDate(new Date())}
              className="inline-flex h-9 items-center rounded-md px-3 text-xs font-black text-app-primary transition hover:bg-app-primary-soft"
            >
              Today
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onValueChange("")}
                className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-xs font-black text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  );
}
