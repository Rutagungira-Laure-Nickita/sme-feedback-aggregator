import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

export const requestLogger = pinoHttp({
  logger,
  autoLogging: true,
  redact: ["req.headers.authorization", "req.headers.cookie"]
});
