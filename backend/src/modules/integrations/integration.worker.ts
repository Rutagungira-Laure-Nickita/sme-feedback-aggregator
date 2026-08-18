import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import {
  processSynchronizationRunBatch,
  recoverStaleSynchronizationRuns
} from "./integration.service.js";

let interval: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startIntegrationSyncWorker(): void {
  if (!env.INTEGRATION_SYNC_WORKER_ENABLED) {
    logger.info("Integration sync worker disabled");
    return;
  }

  if (interval) return;

  logger.info(
    {
      pollIntervalMs: env.INTEGRATION_SYNC_WORKER_POLL_INTERVAL_MS,
      batchSize: env.INTEGRATION_SYNC_WORKER_BATCH_SIZE
    },
    "Integration sync worker started"
  );

  interval = setInterval(() => {
    void runOnce();
  }, env.INTEGRATION_SYNC_WORKER_POLL_INTERVAL_MS);
  void runOnce();
}

export function stopIntegrationSyncWorker(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
  logger.info("Integration sync worker stopped");
}

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await recoverStaleSynchronizationRuns();
    await processSynchronizationRunBatch();
  } catch (_error) {
    logger.error(
      { code: "INTEGRATION_SYNC_WORKER_BATCH_FAILED" },
      "Integration sync worker batch failed"
    );
  } finally {
    running = false;
  }
}
