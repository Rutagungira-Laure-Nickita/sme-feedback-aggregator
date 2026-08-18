import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { useEffect, useRef, useState } from "react";

type GoogleCredentialButtonProps = {
  text: "signin_with" | "signup_with" | "continue_with";
  disabled?: boolean;
  preferredWidth?: number;
  onCredential: (credential: string) => void;
  onClientError: (message: string) => void;
};

const googleClientId = (
  import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
)?.trim();

export function GoogleCredentialButton({
  text,
  disabled = false,
  preferredWidth = 250,
  onCredential,
  onClientError
}: GoogleCredentialButtonProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(preferredWidth);
  const buttonWidth = Math.max(200, Math.min(preferredWidth, availableWidth));

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    const updateWidth = () => {
      setAvailableWidth(Math.floor(container.getBoundingClientRect().width));
    };
    const resizeObserver = new ResizeObserver(updateWidth);

    updateWidth();
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  if (!googleClientId) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          Google sign-in is unavailable until VITE_GOOGLE_CLIENT_ID is configured.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`flex w-full justify-center ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <GoogleLogin
        text={text}
        width={String(buttonWidth)}
        onSuccess={(response: CredentialResponse) => {
          if (disabled) {
            return;
          }

          if (!response.credential) {
            onClientError("Google did not return a credential. Please try again.");
            return;
          }

          onCredential(response.credential);
        }}
        onError={() => {
          if (!disabled) {
            onClientError("Google sign-in was cancelled or could not start.");
          }
        }}
      />
    </div>
  );
}
