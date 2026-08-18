import { Router } from "express";
import {
  dataDeletionPage,
  privacyPolicyPage,
  termsOfServicePage
} from "./legal-pages.js";

export const legalRouter = Router();

legalRouter.get("/privacy", (_request, response) => {
  response.status(200).type("html").send(privacyPolicyPage);
});

legalRouter.get("/terms", (_request, response) => {
  response.status(200).type("html").send(termsOfServicePage);
});

legalRouter.get("/data-deletion", (_request, response) => {
  response.status(200).type("html").send(dataDeletionPage);
});
