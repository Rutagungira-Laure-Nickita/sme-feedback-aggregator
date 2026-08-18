import type { ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "./select.js";

const EMPTY_SELECT_VALUE = "__app_empty_select_value__";

export type AppSelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

type AppSelectFieldProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AppSelectOption[];
  label?: string;
  id?: string;
  name?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
  labelClassName?: string;
  onBlur?: () => void;
};

function toRadixValue(value: string): string {
  return value || EMPTY_SELECT_VALUE;
}

function fromRadixValue(value: string): string {
  return value === EMPTY_SELECT_VALUE ? "" : value;
}

export function AppSelectField({
  value,
  onValueChange,
  options,
  label,
  id,
  name,
  required,
  error,
  disabled,
  placeholder,
  ariaLabel,
  className = "",
  triggerClassName = "",
  labelClassName = "",
  onBlur
}: AppSelectFieldProps): JSX.Element {
  const normalizedOptions =
    placeholder && !options.some((option) => option.value === "")
      ? [{ value: "", label: placeholder }, ...options]
      : options;

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
      <Select
        value={toRadixValue(value)}
        onValueChange={(nextValue) => onValueChange(fromRadixValue(nextValue))}
        disabled={disabled}
        name={name}
        onOpenChange={(open) => {
          if (!open) onBlur?.();
        }}
      >
        <SelectTrigger
          id={id}
          aria-label={ariaLabel ?? label}
          aria-invalid={error ? "true" : "false"}
          className={`${label ? "mt-2" : ""} ${error ? "border-app-error" : ""} ${triggerClassName}`}
        >
          <SelectValue
            placeholder={placeholder}
            className="min-w-0 flex-1 truncate text-left"
          />
        </SelectTrigger>
        <SelectContent>
          {normalizedOptions.map((option) => (
            <SelectItem
              key={`${id ?? ariaLabel ?? label ?? "select"}-${option.value || "empty"}`}
              value={toRadixValue(option.value)}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-app-error">{error}</p>
      ) : null}
    </div>
  );
}
