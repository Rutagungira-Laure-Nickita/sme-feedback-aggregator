export type FeedbackCategoryResponse = {
  id: string;
  name: string;
  description: string | null;
  colorKey: string;
  isActive: boolean;
  feedbackCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type FeedbackCategoryCreateInput = {
  name: string;
  description?: string | null;
  colorKey?: string;
};

export type FeedbackCategoryUpdateInput = {
  name?: string;
  description?: string | null;
  colorKey?: string;
};

export type FeedbackCategoryActivationInput = {
  isActive: boolean;
};

export const ALLOWED_COLOR_KEYS = [
  "slate",
  "blue",
  "indigo",
  "violet",
  "emerald",
  "amber",
  "orange",
  "rose"
] as const;

export const COLOR_KEY_CLASSES: Record<string, string> = {
  slate:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-900/60 dark:text-slate-200 dark:ring-slate-700",
  blue: "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:ring-blue-900/60",
  indigo:
    "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-200 dark:ring-indigo-900/60",
  violet:
    "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-200 dark:ring-violet-900/60",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/60",
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/60",
  orange:
    "bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:ring-orange-900/60",
  rose: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-900/60"
} as const;
