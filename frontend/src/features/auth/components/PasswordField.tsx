import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> & {
  label: string;
  error?: string;
  size?: "default" | "comfortable";
};

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, id, size = "default", ...inputProps }, ref): JSX.Element => {
    const [isVisible, setIsVisible] = useState(false);
    const isComfortable = size === "comfortable";

    return (
      <div>
        <label
          htmlFor={id}
          className={`block text-app-text ${
            isComfortable ? "text-[13px] font-semibold" : "text-xs font-bold"
          }`}
        >
          {label}
        </label>
        <div className="relative mt-2">
          <input
            ref={ref}
            id={id}
            type={isVisible ? "text" : "password"}
            className={`block w-full rounded-md border bg-app-surface text-app-text outline-none transition placeholder:text-app-text-muted/70 focus:border-app-primary focus:ring-2 focus:ring-app-focus/30 disabled:cursor-not-allowed disabled:bg-app-surface-muted disabled:text-app-text-muted ${
              isComfortable
                ? "min-h-12 px-4 pr-12 text-[15px] sm:text-base"
                : "min-h-10 px-3 pr-10 text-sm"
            } ${error ? "border-app-error" : "border-app-border"}`}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error && id ? `${id}-error` : undefined}
            {...inputProps}
          />
          <button
            type="button"
            className={`absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-md text-app-text-muted transition hover:bg-app-surface-muted hover:text-app-text focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
              isComfortable ? "h-9 w-9" : "h-7 w-7"
            }`}
            onClick={() => setIsVisible((current) => !current)}
            aria-label={isVisible ? "Hide password" : "Show password"}
          >
            {isVisible ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
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

PasswordField.displayName = "PasswordField";
