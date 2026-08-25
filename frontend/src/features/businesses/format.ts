export function formatRole(value: string): string {
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
    ADMIN: "Business Admin",
    MANAGER: "Manager",
    STAFF: "Staff"
  };
  return labels[value] ?? formatRole(value);
}
