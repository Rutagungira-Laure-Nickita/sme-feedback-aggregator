import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { processAutomationEventBatch } from "./automation.service.js";

let interval: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startAutomationWorker(): void {
  if (!env.AUTOMATION_WORKER_ENABLED) {
    logger.info("Automation worker disabled");
    return;
  }

  if (interval) return;

  logger.info(
    {
      pollIntervalMs: env.AUTOMATION_WORKER_POLL_INTERVAL_MS,
      batchSize: env.AUTOMATION_WORKER_BATCH_SIZE
    },
    "Automation worker started"
  );

  interval = setInterval(() => {
    void runOnce();
  }, env.AUTOMATION_WORKER_POLL_INTERVAL_MS);
  void runOnce();
}

export function stopAutomationWorker(): void {
  if (!interval) return;
  clearInterval(interval);
  interval = null;
  logger.info("Automation worker stopped");
}

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await processAutomationEventBatch();
  } catch (_error) {
    logger.error(
      { code: "AUTOMATION_WORKER_BATCH_FAILED" },
      "Automation worker batch failed"
    );
  } finally {
    running = false;
  }
}
