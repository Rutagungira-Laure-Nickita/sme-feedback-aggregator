import { MessageSquareText } from "lucide-react";
import { usePlatformSettings } from "../../platform-settings/PlatformSettingsContext.js";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({
  className = "",
  compact = false
}: BrandMarkProps): JSX.Element {
  const { settings } = usePlatformSettings();

  return (
    <div className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-app-primary text-app-primary-foreground shadow-lg shadow-app-primary/20">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <MessageSquareText className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-black leading-4 text-app-text">
          {settings.platformName}
        </span>
        {compact ? null : (
          <span className="block truncate text-xs font-semibold leading-4 text-app-text-muted">
            {settings.brandTagline}
          </span>
        )}
      </span>
    </div>
  );
}
