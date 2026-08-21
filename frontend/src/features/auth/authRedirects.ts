import type { SafeUser } from "./types/authTypes.js";

export function getDefaultAuthenticatedRoute(
  user: Pick<SafeUser, "role"> | null | undefined
): string {
  switch (user?.role) {
    case "PLATFORM_ADMIN":
      return "/admin";
    case "BUSINESS_OWNER":
    case "STAFF":
      return "/business";
    case "CUSTOMER":
      return "/customer";
    default:
      return "/account";
  }
}
