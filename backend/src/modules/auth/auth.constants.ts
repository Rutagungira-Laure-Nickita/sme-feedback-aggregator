export const AUTH_COOKIE_NAMES = {
  accessToken: "sme_access_token",
  refreshToken: "sme_refresh_token"
} as const;

export const ACCESS_TOKEN_TYPE = "access";
export const REFRESH_TOKEN_TYPE = "refresh";
export const AUTH_TOKEN_ISSUER = "sme-feedback-aggregator-api";
export const AUTH_TOKEN_AUDIENCE = "sme-feedback-aggregator-web";

export const PUBLIC_REGISTRATION_ROLES = ["BUSINESS_OWNER", "CUSTOMER"] as const;
