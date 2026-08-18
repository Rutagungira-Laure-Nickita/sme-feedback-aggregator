import { Router } from "express";
import { apiHealthController, databaseHealthController } from "./health.controller.js";

export const healthRouter = Router();

healthRouter.get("/", apiHealthController);
healthRouter.get("/database", databaseHealthController);
