import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { getAIOperationalState, processAIAnalysisBatch } from "./ai-analysis.service.js";

let interval: ReturnType<typeof setInterval> | null = null;
let running = false;

export function startAIAnalysisWorker(): void {
  const state = getAIOperationalState();
  if (state !== "READY") {
    if (env.AI_ANALYSIS_ENABLED) {
      logger.warn({ operationalState: state }, "AI analysis worker not started");
    }
    return;
  }

  if (interval) return;

  logger.info(
    {
      provider: env.AI_PROVIDER,
      model: env.AI_MODEL,
      pollIntervalMs: env.AI_WORKER_POLL_INTERVAL_MS,
      batchSize: env.AI_WORKER_BATCH_SIZE
    },
    "AI analysis worker started"
  );

  interval = setInterval(() => {
    void runOnce();
  }, env.AI_WORKER_POLL_INTERVAL_MS);
  void runOnce();
}

export function stopAIAnalysisWorker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
    logger.info("AI analysis worker stopped");
  }
}

async function runOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await processAIAnalysisBatch();
  } catch (_error) {
    logger.error({ code: "AI_WORKER_BATCH_FAILED" }, "AI analysis worker batch failed");
  } finally {
    running = false;
  }
}
