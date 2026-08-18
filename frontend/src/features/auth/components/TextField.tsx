import { AlertCircle } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  error?: string;
  size?: "default" | "comfortable";
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  (
    { label, error, id, size = "default", className = "", ...inputProps },
    ref
  ): JSX.Element => {
    const isComfortable = size === "comfortable";

    return (
      <div className={className}>
        <label
          htmlFor={id}
          className={`block text-app-text ${
            isComfortable ? "text-[13px] font-semibold" : "text-xs font-bold"
          }`}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          className={`mt-2 block w-full rounded-md border bg-app-surface text-app-text outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-app-text-muted ${
            isComfortable
              ? "min-h-12 px-4 text-[15px] sm:text-base"
              : "min-h-10 px-3 text-sm"
          } ${error ? "border-app-error" : "border-app-border"}`}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error && id ? `${id}-error` : undefined}
          {...inputProps}
        />
        {error ? (
          <p
            id={id ? `${id}-error` : undefined}
            className="mt-2 flex items-start gap-1.5 text-sm font-medium text-app-error"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

TextField.displayName = "TextField";
