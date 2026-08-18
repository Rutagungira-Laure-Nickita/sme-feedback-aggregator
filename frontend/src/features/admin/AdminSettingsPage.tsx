import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Globe2,
  Image,
  Save,
  Settings2,
  SunMoon
} from "lucide-react";
import { normalizeApiError } from "../../api/axios.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { AdminShell, WorkspaceButton, WorkspacePanel } from "../businesses/components.js";
import { updatePlatformSettings } from "../platform-settings/api.js";
import {
  FIXED_ACCENT_COLOR,
  FIXED_PRIMARY_COLOR
} from "../platform-settings/color-tokens.js";
import { usePlatformSettings } from "../platform-settings/PlatformSettingsContext.js";
import type { PlatformSettingsUpdate } from "../platform-settings/types.js";

type SettingsSection = "GENERAL" | "BRANDING" | "PUBLIC" | "APPEARANCE" | "REPORTS";

const sections: Array<{
  id: SettingsSection;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: "GENERAL", label: "General", icon: Settings2 },
  { id: "BRANDING", label: "Branding", icon: Image },
  { id: "PUBLIC", label: "Public website", icon: Globe2 },
  { id: "APPEARANCE", label: "Appearance", icon: SunMoon },
  { id: "REPORTS", label: "Reports", icon: FileText }
];

export function AdminSettingsPage(): JSX.Element {
  const { settings, isLoading, applySettings } = usePlatformSettings();
  const [form, setForm] = useState<PlatformSettingsUpdate>(() => toForm(settings));
  const [activeSection, setActiveSection] = useState<SettingsSection>("GENERAL");
  const [isSaving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(toForm(settings)), [settings]);

  const update = <K extends keyof PlatformSettingsUpdate>(
    key: K,
    value: PlatformSettingsUpdate[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await updatePlatformSettings({
        ...form,
        primaryColor: FIXED_PRIMARY_COLOR,
        accentColor: FIXED_ACCENT_COLOR
      });
      applySettings(saved);
      setMessage("Platform settings saved and applied globally.");
    } catch (caught) {
      setError(normalizeApiError(caught).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell
      title="Platform settings"
      subtitle="Manage real platform identity, public content, appearance, and report defaults."
    >
      <form onSubmit={submit}>
        <nav
          className="mb-5 flex max-w-full gap-1 overflow-x-auto rounded-lg border border-app-border bg-app-surface-muted/60 p-1"
          aria-label="Platform settings sections"
        >
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveSection(id)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-app-focus/30 ${
                activeSection === id
                  ? "bg-app-primary text-app-primary-foreground shadow-sm"
                  : "text-app-text-muted hover:bg-app-surface hover:text-app-text"
              }`}
              aria-current={activeSection === id ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>

        <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-5">
            {activeSection === "GENERAL" ? (
              <SettingsPanel
                icon={<Settings2 className="h-5 w-5" />}
                title="General identity"
                description="The platform name and plain-language description used across authenticated and public surfaces."
              >
                <TextField
                  label="Platform name"
                  value={form.platformName}
                  maxLength={80}
                  onChange={(value) => update("platformName", value)}
                />
                <TextField
                  label="Brand tagline"
                  value={form.brandTagline}
                  maxLength={120}
                  onChange={(value) => update("brandTagline", value)}
                />
                <TextAreaField
                  label="Platform description"
                  value={form.platformDescription}
                  maxLength={500}
                  onChange={(value) => update("platformDescription", value)}
                />
              </SettingsPanel>
            ) : null}

            {activeSection === "BRANDING" ? (
              <SettingsPanel
                icon={<Image className="h-5 w-5" />}
                title="Branding"
                description="Logo and footer identity only. The core application color system is fixed professional Indigo."
              >
                <TextField
                  label="Logo URL (optional)"
                  value={form.logoUrl ?? ""}
                  maxLength={2048}
                  type="url"
                  className="sm:col-span-2"
                  placeholder="https://cdn.example.com/logo.png"
                  onChange={(value) => update("logoUrl", value.trim() ? value : null)}
                />
                <TextField
                  label="Footer text"
                  value={form.footerText}
                  maxLength={180}
                  className="sm:col-span-2"
                  onChange={(value) => update("footerText", value)}
                />
              </SettingsPanel>
            ) : null}

            {activeSection === "PUBLIC" ? (
              <SettingsPanel
                icon={<Globe2 className="h-5 w-5" />}
                title="Public website"
                description="Bounded content already consumed by the homepage, calls to action, and contact page."
              >
                <TextField
                  label="Hero headline"
                  value={form.headline}
                  maxLength={180}
                  className="sm:col-span-2"
                  onChange={(value) => update("headline", value)}
                />
                <TextAreaField
                  label="Hero supporting text"
                  value={form.heroSupportingText}
                  maxLength={320}
                  onChange={(value) => update("heroSupportingText", value)}
                />
                <TextField
                  label="Primary CTA label"
                  value={form.primaryCtaLabel}
                  maxLength={60}
                  onChange={(value) => update("primaryCtaLabel", value)}
                />
                <TextField
                  label="Secondary CTA label"
                  value={form.secondaryCtaLabel}
                  maxLength={60}
                  onChange={(value) => update("secondaryCtaLabel", value)}
                />
                <TextField
                  label="Support email"
                  type="email"
                  value={form.supportEmail}
                  maxLength={255}
                  onChange={(value) => update("supportEmail", value)}
                />
                <TextField
                  label="Support phone (optional)"
                  value={form.supportPhone ?? ""}
                  maxLength={40}
                  required={false}
                  onChange={(value) =>
                    update("supportPhone", value.trim() ? value : null)
                  }
                />
              </SettingsPanel>
            ) : null}

            {activeSection === "APPEARANCE" ? (
              <SettingsPanel
                icon={<SunMoon className="h-5 w-5" />}
                title="Default appearance"
                description="This is the authoritative global appearance and applies immediately after Save."
              >
                <AppSelectField
                  id="platform-default-appearance"
                  label="Appearance"
                  value={form.defaultAppearance}
                  onValueChange={(value) =>
                    update(
                      "defaultAppearance",
                      value as PlatformSettingsUpdate["defaultAppearance"]
                    )
                  }
                  options={[
                    { value: "LIGHT", label: "Light" },
                    { value: "DARK", label: "Dark" },
                    { value: "SYSTEM", label: "System" }
                  ]}
                  className="max-w-md sm:col-span-2"
                />
              </SettingsPanel>
            ) : null}

            {activeSection === "REPORTS" ? (
              <SettingsPanel
                icon={<FileText className="h-5 w-5" />}
                title="Report defaults"
                description="Defaults already consumed by the Reporting Center and generated exports."
              >
                <label className="block min-w-0 text-[13px] font-semibold">
                  Default report range (days)
                  <input
                    type="number"
                    required
                    min={7}
                    max={366}
                    value={form.defaultReportRangeDays}
                    onChange={(event) =>
                      update("defaultReportRangeDays", Number(event.target.value))
                    }
                    className="mt-2 min-h-11 w-full rounded-md border border-app-border bg-app-surface px-3 text-sm outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/20"
                  />
                </label>
                <TextField
                  label="Report footer"
                  value={form.reportFooterText}
                  maxLength={180}
                  onChange={(value) => update("reportFooterText", value)}
                />
              </SettingsPanel>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div aria-live="polite">
                {message ? (
                  <p className="flex items-center gap-2 text-sm font-bold text-app-success">
                    <CheckCircle2 className="h-4 w-4" /> {message}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-sm font-bold text-app-error">{error}</p>
                ) : null}
              </div>
              <WorkspaceButton type="submit" disabled={isSaving || isLoading}>
                <Save className="h-4 w-4" /> {isSaving ? "Saving…" : "Save settings"}
              </WorkspaceButton>
            </div>
          </div>

          <WorkspacePanel className="h-fit xl:sticky xl:top-6">
            <h2 className="text-base font-bold">Live preview</h2>
            <p className="mt-1 text-xs font-medium leading-5 text-app-text-muted">
              Identity and public content previewed with the fixed Indigo design system.
            </p>
            <div className="mt-5 overflow-hidden rounded-lg border border-app-border">
              <div className="h-2 bg-app-primary" />
              <div className="p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-app-primary text-app-primary-foreground">
                    {form.logoUrl ? (
                      <img
                        src={form.logoUrl}
                        alt="Brand preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Image className="h-5 w-5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="break-words text-sm font-bold">{form.platformName}</p>
                    <p className="break-words text-xs font-medium text-app-text-muted">
                      {form.brandTagline}
                    </p>
                  </div>
                </div>
                <p className="mt-5 break-words text-xl font-bold leading-tight">
                  {form.headline}
                </p>
                <p className="mt-3 text-sm leading-6 text-app-text-muted">
                  {form.heroSupportingText}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-md bg-app-primary px-3 py-2 text-xs font-bold text-app-primary-foreground">
                    {form.primaryCtaLabel}
                  </span>
                  <span className="rounded-md border border-app-border px-3 py-2 text-xs font-bold">
                    {form.secondaryCtaLabel}
                  </span>
                </div>
                <p className="mt-6 border-t border-app-border pt-4 text-xs font-medium text-app-text-muted">
                  {form.footerText}
                </p>
              </div>
            </div>
            {settings.updatedAt ? (
              <p className="mt-4 text-xs font-medium text-app-text-muted">
                Last saved {new Date(settings.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </WorkspacePanel>
        </div>
      </form>
    </AdminShell>
  );
}

function SettingsPanel({
  icon,
  title,
  description,
  children
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <WorkspacePanel>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-app-primary">{icon}</span>
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm font-medium leading-6 text-app-text-muted">
            {description}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </WorkspacePanel>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
  type = "text",
  className = "",
  placeholder,
  required = true
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  type?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className={`block min-w-0 text-[13px] font-semibold ${className}`}>
      {label}
      <input
        type={type}
        required={required && type !== "url"}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full min-w-0 rounded-md border border-app-border bg-app-surface px-3 text-sm text-app-text outline-none transition focus:border-app-primary focus:ring-2 focus:ring-app-focus/20"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  maxLength
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
}) {
  return (
    <label className="block min-w-0 text-[13px] font-semibold sm:col-span-2">
      {label}
      <textarea
        required
        rows={3}
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-y rounded-md border border-app-border bg-app-surface px-3 py-3 text-sm outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/20"
      />
    </label>
  );
}

function toForm(
  settings: ReturnType<typeof usePlatformSettings>["settings"]
): PlatformSettingsUpdate {
  const { updatedAt: _updatedAt, ...form } = settings;
  return {
    ...form,
    primaryColor: FIXED_PRIMARY_COLOR,
    accentColor: FIXED_ACCENT_COLOR
  };
}
