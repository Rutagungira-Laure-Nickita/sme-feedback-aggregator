import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  size?: "default" | "comfortable";
};

export function Button({
  children,
  className = "",
  disabled,
  icon,
  isLoading = false,
  loadingText,
  size = "default",
  ...buttonProps
}: ButtonProps): JSX.Element {
  const sizeClasses =
    size === "comfortable"
      ? "min-h-12 px-5 text-[15px] font-semibold sm:text-base"
      : "min-h-11 px-4 text-sm font-bold";

  return (
    <button
      className={`inline-flex w-full items-center justify-center gap-2 rounded-md bg-app-primary text-app-primary-foreground shadow-lg shadow-app-primary/20 transition hover:bg-app-primary-hover active:translate-y-px disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none ${sizeClasses} ${className}`}
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : icon}
      {isLoading && loadingText ? loadingText : children}
    </button>
  );
}
