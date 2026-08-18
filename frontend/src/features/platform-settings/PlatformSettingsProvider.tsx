import { useCallback, useEffect, useState, type ReactNode } from "react";
import { fetchPlatformSettings } from "./api.js";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PlatformSettingsContext
} from "./PlatformSettingsContext.js";
import type { PlatformSettings } from "./types.js";

export function PlatformSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState(DEFAULT_PLATFORM_SETTINGS);
  const [isLoading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  const applySettings = useCallback((nextSettings: PlatformSettings) => {
    setSettings(nextSettings);
    setRevision((current) => current + 1);
  }, []);

  useEffect(() => {
    let active = true;
    void fetchPlatformSettings()
      .then((value) => {
        if (active) {
          setSettings(value);
          setRevision((current) => current + 1);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.title = settings.platformName;
  }, [settings.platformName]);

  return (
    <PlatformSettingsContext.Provider
      value={{ settings, isLoading, revision, applySettings }}
    >
      {children}
    </PlatformSettingsContext.Provider>
  );
}
