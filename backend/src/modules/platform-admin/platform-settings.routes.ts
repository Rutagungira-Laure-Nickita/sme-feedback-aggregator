import { Router } from "express";
import { publicPlatformSettingsController } from "./platform-admin.controller.js";

export const platformSettingsPublicRouter = Router();

platformSettingsPublicRouter.get("/", publicPlatformSettingsController);
