import { useEffect, useMemo, useState } from "react";

type BusinessBrandAvatarProps = {
  businessName: string;
  logoUrl: string | null;
};

export function BusinessBrandAvatar({
  businessName,
  logoUrl
}: BusinessBrandAvatarProps): JSX.Element {
  const [imageFailed, setImageFailed] = useState(false);
  const safeLogoUrl = useMemo(() => logoUrl?.trim() || null, [logoUrl]);

  useEffect(() => {
    setImageFailed(false);
  }, [safeLogoUrl]);

  if (safeLogoUrl && !imageFailed) {
    return (
      <img
        src={safeLogoUrl}
        alt={`${businessName} logo`}
        className="h-12 w-12 rounded-md object-cover"
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-amber-50 text-sm font-black text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/70"
      aria-label={`${businessName} initials`}
      role="img"
    >
      {initialsFor(businessName)}
    </div>
  );
}

function initialsFor(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "SM";
}
