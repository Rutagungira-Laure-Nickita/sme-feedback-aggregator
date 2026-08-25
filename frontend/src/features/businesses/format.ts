export function formatRole(value: string): string {
  const roleLabels: Record<string, string> = {
    ADMIN: "Business Owner",
    BUSINESS_ADMIN: "Business Owner",
    BUSINESS_OWNER: "Business Owner",
    OWNER: "Business Owner",
    PLATFORM_ADMIN: "Platform Administrator"
  };
  if (roleLabels[value]) return roleLabels[value];
  if (value === "EMAIL") return "Gmail";
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatBusinessRole(value: string): string {
  const labels: Record<string, string> = {
    OWNER: "Business Owner",
    ADMIN: "Business Owner",
    MANAGER: "Manager",
    STAFF: "Staff"
  };
  return labels[value] ?? formatRole(value);
}
