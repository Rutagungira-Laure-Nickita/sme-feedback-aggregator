import { BarChart3, Mail, MessageCircle, QrCode, Star, TrendingUp } from "lucide-react";

const channelBadges = [
  { label: "Email", icon: Mail },
  { label: "Reviews", icon: Star },
  { label: "QR", icon: QrCode },
  { label: "Chat", icon: MessageCircle }
];

export function LoginIllustration(): JSX.Element {
  return (
    <div className="pointer-events-none absolute bottom-14 right-5 top-20 hidden w-[440px] lg:block xl:right-8 xl:w-[490px]">
      <div className="absolute left-10 top-28 h-40 w-56 rounded-[50%] border border-dashed border-indigo-200 dark:border-indigo-400/20" />
      <div className="absolute left-24 top-4 h-64 w-80 rounded-[50%] border border-dashed border-indigo-200 dark:border-indigo-400/20" />
      <div className="absolute left-2 top-24 inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-primary shadow-panel">
        <span className="text-lg font-black">G</span>
      </div>

      <div className="absolute right-10 top-0 w-48 rounded-lg border border-app-border bg-app-surface/95 p-4 shadow-panel backdrop-blur dark:bg-slate-900/80 xl:right-20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black text-app-text">Overall Sentiment</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-2xl font-black leading-none text-app-text">4.6</p>
              <p className="text-sm font-black text-app-text-muted">/5</p>
              <span className="text-xs font-black text-app-success">+12%</span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-app-text-muted">
              vs last 30 days
            </p>
          </div>
          <TrendingUp className="h-4 w-4 text-app-success" aria-hidden="true" />
        </div>
        <div className="mt-5 flex h-12 items-end gap-1.5">
          {[22, 24, 31, 30, 40, 46, 42, 54].map((height) => (
            <span
              key={height}
              className="w-full rounded-t bg-app-primary/80"
              style={{ height }}
            />
          ))}
        </div>
      </div>

      <div className="absolute right-0 top-36 w-48 rounded-lg border border-app-border bg-app-surface/95 p-4 shadow-panel backdrop-blur dark:bg-slate-900/80 xl:right-8">
        <p className="text-[11px] font-black text-app-text">New Feedback</p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-2xl font-black leading-none text-app-text">1,248</p>
          <span className="text-xs font-black text-app-success">+18%</span>
        </div>
        <p className="mt-1 text-[11px] font-semibold text-app-text-muted">
          vs last 30 days
        </p>
        <div className="mt-5 flex h-16 items-end gap-1.5">
          {[20, 32, 28, 44, 26, 51, 40, 62].map((height) => (
            <span
              key={height}
              className="w-full rounded-t bg-app-primary"
              style={{ height }}
            />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 right-5 w-64 rounded-lg border border-app-border bg-app-surface/95 p-4 shadow-panel backdrop-blur dark:bg-slate-900/85 xl:right-16">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-emerald-100 text-sm font-black text-slate-800">
            KW
          </span>
          <div className="flex gap-0.5 text-amber-400">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" aria-hidden="true" />
            ))}
          </div>
        </div>
        <p className="mt-4 text-base font-black leading-5 text-app-text">
          Great service and amazing experience!
        </p>
        <p className="mt-2 text-xs font-semibold text-app-text-muted">
          Kayla White - Cafe Lumiere
        </p>
        <p className="mt-4 text-[11px] font-semibold text-app-text-muted">
          2 min ago - Google
        </p>
      </div>

      <div className="absolute bottom-7 left-16 inline-flex h-12 w-12 items-center justify-center rounded-full border border-app-border bg-app-surface text-app-success shadow-panel">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
      </div>

      <div className="absolute left-0 top-60 grid w-48 grid-cols-4 gap-2">
        {channelBadges.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-app-border bg-app-surface text-app-primary shadow-sm"
            aria-label={label}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        ))}
      </div>

      <div className="absolute left-2 top-0 rounded-lg border border-app-border bg-app-surface/90 px-3 py-2 shadow-sm dark:bg-slate-900/80">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-app-primary" aria-hidden="true" />
          <span className="text-xs font-black text-app-text">Live insights</span>
        </div>
      </div>
    </div>
  );
}
