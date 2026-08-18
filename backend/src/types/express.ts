import type { AuthenticatedRequestUser } from "../modules/auth/auth.types.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthenticatedRequestUser;
  }
}

export {};
