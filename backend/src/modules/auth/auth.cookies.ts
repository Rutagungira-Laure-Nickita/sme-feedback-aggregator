import type { Response } from "express";
import type { CookieOptions } from "express-serve-static-core";
import { env } from "../../config/env.js";
import { AUTH_COOKIE_NAMES } from "./auth.constants.js";
import { parseDurationMs } from "./auth.tokens.js";

const ACCESS_COOKIE_PATH = "/api";
const REFRESH_COOKIE_PATH = "/api/auth";

export function setAuthCookies(
  response: Response,
  tokens: { accessToken: string; refreshToken: string }
): void {
  response.cookie(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, {
    ...baseCookieOptions(),
    path: ACCESS_COOKIE_PATH,
    maxAge: parseDurationMs(env.JWT_ACCESS_EXPIRES_IN)
  });

  response.cookie(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN)
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(AUTH_COOKIE_NAMES.accessToken, {
    ...baseCookieOptions(),
    path: ACCESS_COOKIE_PATH,
    maxAge: undefined
  });

  response.clearCookie(AUTH_COOKIE_NAMES.refreshToken, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: undefined
  });
}

function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN
  };
}
