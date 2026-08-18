import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { PremiumAuthShell } from "../components/PremiumAuthShell.js";

export function PasswordResetSuccessPage(): JSX.Element {
  return (
    <PremiumAuthShell
      title="Password updated successfully"
      subtitle="Your password has been updated and your account is more secure than ever."
      visualKind="passwordResetSuccess"
      visualTitle="Your account is secure"
      visualSubtitle="We updated your password and protected your account across all active devices."
      formPosition="right"
      compact
      footer={
        <p className="font-medium text-app-text-muted">
          Security is our priority. Thank you for keeping your account safe.
        </p>
      }
    >
      <div className="space-y-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
          <CheckCircle2 className="h-11 w-11" aria-hidden="true" />
        </div>

        <div className="rounded-lg border border-app-border bg-app-surface-muted p-5">
          <h2 className="text-base font-black text-app-text">What happens next</h2>
          <div className="mt-4 space-y-4">
            {[
              {
                icon: LockKeyhole,
                title: "You will need to sign in again",
                description: "Please sign in with your new password to continue."
              },
              {
                icon: ShieldCheck,
                title: "Previous sessions revoked",
                description: "We signed you out from all other devices for your security."
              },
              {
                icon: CheckCircle2,
                title: "Your account is protected",
                description: "You can now securely access your account and all features."
              }
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-app-primary-soft text-app-primary">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-black text-app-text">{title}</span>
                  <span className="mt-1 block text-sm font-medium leading-5 text-app-text-muted">
                    {description}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/login?reset=success"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-app-primary px-5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-app-primary-hover focus:outline-none focus:ring-2 focus:ring-app-focus/30"
        >
          Return to sign in
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </PremiumAuthShell>
  );
}
