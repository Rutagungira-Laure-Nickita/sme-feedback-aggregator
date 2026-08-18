import type { ReactNode } from "react";

type StatusLayoutProps = {
  children: ReactNode;
};

export function StatusLayout({ children }: StatusLayoutProps): JSX.Element {
  return (
    <main className="min-h-screen bg-[#f7f8fb]">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-10">
        {children}
      </div>
    </main>
  );
}
