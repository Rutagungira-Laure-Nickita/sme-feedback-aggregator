import { Router } from "express";
import {
  receiveWhatsAppWebhookController,
  verifyWhatsAppWebhookController
} from "./whatsapp-webhook.controller.js";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", verifyWhatsAppWebhookController);
whatsappWebhookRouter.post("/", receiveWhatsAppWebhookController);
