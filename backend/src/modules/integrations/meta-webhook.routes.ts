import { Router } from "express";
import {
  receiveMetaWebhookController,
  verifyMetaWebhookController
} from "./meta-webhook.controller.js";

export const metaWebhookRouter = Router();

metaWebhookRouter.get("/", verifyMetaWebhookController);
metaWebhookRouter.post("/", receiveMetaWebhookController);
