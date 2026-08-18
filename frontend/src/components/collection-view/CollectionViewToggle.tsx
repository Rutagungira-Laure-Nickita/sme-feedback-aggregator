import { LayoutGrid, List } from "lucide-react";
import type { CollectionView } from "./collection-view.js";

export function CollectionViewToggle({
  view,
  onChange,
  label = "Collection view"
}: {
  view: CollectionView;
  onChange: (view: CollectionView) => void;
  label?: string;
}): JSX.Element {
  return (
    <div
      className="inline-flex shrink-0 rounded-md border border-app-border bg-app-surface p-1 shadow-sm"
      role="group"
      aria-label={label}
    >
      <ViewButton
        active={view === "list"}
        label="List view"
        icon={<List className="h-4 w-4" aria-hidden="true" />}
        onClick={() => onChange("list")}
      />
      <ViewButton
        active={view === "grid"}
        label="Grid view"
        icon={<LayoutGrid className="h-4 w-4" aria-hidden="true" />}
        onClick={() => onChange("grid")}
      />
    </div>
  );
}

function ViewButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded px-2.5 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 sm:px-3 ${
        active
          ? "bg-app-primary text-app-primary-foreground"
          : "text-app-text-muted hover:bg-app-surface-muted hover:text-app-text"
      }`}
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {icon}
      <span className="hidden sm:inline">{label.replace(" view", "")}</span>
    </button>
  );
}
