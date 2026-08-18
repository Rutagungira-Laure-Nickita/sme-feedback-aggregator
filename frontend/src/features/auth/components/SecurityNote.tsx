import { ShieldCheck } from "lucide-react";

type SecurityNoteProps = {
  text: string;
};

export function SecurityNote({ text }: SecurityNoteProps): JSX.Element {
  return (
    <p className="inline-flex items-start gap-2 text-sm font-medium leading-5 text-app-text-muted">
      <ShieldCheck
        className="mt-0.5 h-4 w-4 shrink-0 text-app-success"
        aria-hidden="true"
      />
      <span>{text}</span>
    </p>
  );
}
