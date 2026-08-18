import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { normalizeApiError } from "../../api/axios.js";
import { AppSelectField } from "../../components/ui/select-field.js";
import { createAdminBusiness } from "../businesses/api/businessApi.js";
import { AdminShell, WorkspaceButton, WorkspacePanel } from "../businesses/components.js";
import { fetchAdminUsers } from "./api.js";

const initial = {
  ownerUserId: "",
  name: "",
  industry: "",
  description: "",
  email: "",
  phone: "",
  website: "",
  country: "",
  city: "",
  district: "",
  addressLine: "",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  primaryBranchName: "Head office",
  primaryBranchCode: "HQ",
  primaryBranchAddress: "",
  primaryBranchCity: "",
  primaryBranchCountry: ""
};

export function AdminBusinessCreatePage(): JSX.Element {
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  const owners = useQuery({
    queryKey: ["admin", "business-owner-options"],
    queryFn: () =>
      fetchAdminUsers({ role: "BUSINESS_OWNER", status: "ACTIVE", pageSize: "100" })
  });
  const mutation = useMutation({
    mutationFn: () =>
      createAdminBusiness({
        ownerUserId: form.ownerUserId,
        name: form.name,
        industry: form.industry,
        description: form.description || undefined,
        email: form.email,
        phone: form.phone,
        website: form.website || undefined,
        country: form.country,
        city: form.city,
        district: form.district || undefined,
        addressLine: form.addressLine,
        timezone: form.timezone,
        primaryBranch: {
          name: form.primaryBranchName,
          code: form.primaryBranchCode,
          addressLine: form.primaryBranchAddress,
          city: form.primaryBranchCity,
          country: form.primaryBranchCountry
        }
      }),
    onSuccess: (business) => navigate(`/admin/businesses/${business.id}`)
  });
  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  return (
    <AdminShell
      title="Create business"
      subtitle="Create a tenant record for an existing active business owner. The business remains pending until explicitly approved."
    >
      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <WorkspacePanel>
          <h2 className="text-lg font-black">Ownership and business identity</h2>
          <p className="mt-1 text-sm text-app-text-muted">
            No workspace access is enabled by creation alone.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AppSelectField
              label="Business owner"
              value={form.ownerUserId}
              onValueChange={(value) => update("ownerUserId", value)}
              options={(owners.data?.users ?? []).map((user) => ({
                value: user.id,
                label: `${user.firstName} ${user.lastName} · ${user.email}`
              }))}
              placeholder="Choose an active owner"
            />
            <Field
              label="Business name"
              value={form.name}
              onChange={(value) => update("name", value)}
            />
            <Field
              label="Industry"
              value={form.industry}
              onChange={(value) => update("industry", value)}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(value) => update("email", value)}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(value) => update("phone", value)}
            />
            <Field
              label="Website (optional)"
              type="url"
              required={false}
              value={form.website}
              onChange={(value) => update("website", value)}
            />
            <Field
              label="Country"
              value={form.country}
              onChange={(value) => update("country", value)}
            />
            <Field
              label="City"
              value={form.city}
              onChange={(value) => update("city", value)}
            />
            <Field
              label="District (optional)"
              required={false}
              value={form.district}
              onChange={(value) => update("district", value)}
            />
            <Field
              label="Address"
              value={form.addressLine}
              onChange={(value) => update("addressLine", value)}
            />
            <Field
              label="Timezone"
              value={form.timezone}
              onChange={(value) => update("timezone", value)}
            />
            <Field
              label="Description (optional)"
              required={false}
              value={form.description}
              onChange={(value) => update("description", value)}
            />
          </div>
        </WorkspacePanel>
        <WorkspacePanel>
          <h2 className="text-lg font-black">Primary branch</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field
              label="Branch name"
              value={form.primaryBranchName}
              onChange={(value) => update("primaryBranchName", value)}
            />
            <Field
              label="Branch code"
              value={form.primaryBranchCode}
              onChange={(value) => update("primaryBranchCode", value.toUpperCase())}
            />
            <Field
              label="Branch address"
              value={form.primaryBranchAddress}
              onChange={(value) => update("primaryBranchAddress", value)}
            />
            <Field
              label="Branch city"
              value={form.primaryBranchCity}
              onChange={(value) => update("primaryBranchCity", value)}
            />
            <Field
              label="Branch country"
              value={form.primaryBranchCountry}
              onChange={(value) => update("primaryBranchCountry", value)}
            />
          </div>
        </WorkspacePanel>
        {mutation.error ? (
          <p className="text-sm font-bold text-app-error">
            {normalizeApiError(mutation.error).message}
          </p>
        ) : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <WorkspaceButton tone="secondary" to="/admin/businesses">
            Cancel
          </WorkspaceButton>
          <WorkspaceButton
            type="submit"
            disabled={mutation.isPending || !form.ownerUserId}
          >
            {mutation.isPending ? "Creating…" : "Create pending business"}
          </WorkspaceButton>
        </div>
      </form>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = true
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-semibold">
      {label}
      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-11 w-full min-w-0 rounded-md border border-app-border bg-app-surface px-3 outline-none focus:border-app-primary focus:ring-2 focus:ring-app-focus/20"
      />
    </label>
  );
}
