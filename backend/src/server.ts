import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { createApp } from "./app.js";
import {
  startAIAnalysisWorker,
  stopAIAnalysisWorker
} from "./modules/ai-analysis/index.js";
import {
  startAutomationWorker,
  stopAutomationWorker
} from "./modules/automation/index.js";
import {
  startIntegrationSyncWorker,
  stopIntegrationSyncWorker
} from "./modules/integrations/index.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, environment: env.NODE_ENV },
    "SME Feedback Aggregator API listening"
  );
  startAIAnalysisWorker();
  startAutomationWorker();
  startIntegrationSyncWorker();
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down API server");

  server.close(async () => {
    stopAIAnalysisWorker();
    stopAutomationWorker();
    stopIntegrationSyncWorker();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
