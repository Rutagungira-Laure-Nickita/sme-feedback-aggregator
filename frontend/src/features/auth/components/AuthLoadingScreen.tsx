import { Loader2 } from "lucide-react";

export function AuthLoadingScreen(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] px-5">
      <div className="flex items-center gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-panel">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading account
      </div>
    </main>
  );
}
