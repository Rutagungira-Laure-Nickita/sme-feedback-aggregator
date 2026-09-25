import "dotenv/config";
import {
  FeedbackFieldStateField,
  FeedbackFieldStateSource
} from "../lib/prisma-runtime.js";
import { prisma } from "../lib/prisma.js";
import { scheduleAnalysisForFeedback } from "../modules/ai-analysis/ai-analysis.service.js";
import { resolveInitialFeedbackCategory } from "../modules/feedback-processing/feedback-category-assignment.js";
import { activeOperationalFeedbackWhere } from "../modules/integrations/supported-integration-policy.js";

const apply = process.argv.includes("--apply");
const allowProduction = process.argv.includes("--allow-production");

async function main() {
  if (process.env.NODE_ENV === "production" && apply && !allowProduction) {
    throw new Error(
      "Production backfill requires both --apply and --allow-production after review."
    );
  }

  const feedback = await prisma.feedback.findMany({
    where: activeOperationalFeedbackWhere({
      categoryId: null,
      fieldStates: {
        none: {
          field: FeedbackFieldStateField.CATEGORY,
          source: {
            in: [FeedbackFieldStateSource.HUMAN, FeedbackFieldStateSource.AUTOMATION]
          }
        }
      }
    }),
    select: { id: true, businessId: true, channel: true, receivedAt: true },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }]
  });

  const summary = feedback.reduce<Record<string, number>>((counts, item) => {
    counts[item.businessId] = (counts[item.businessId] ?? 0) + 1;
    return counts;
  }, {});

  console.log(
    JSON.stringify(
      {
        mode: apply ? "apply" : "dry-run",
        matchingActiveUncategorizedFeedback: feedback.length,
        byBusiness: summary
      },
      null,
      2
    )
  );

  if (!apply || feedback.length === 0) return;

  const updatedIds: string[] = [];
  for (const item of feedback) {
    const changed = await prisma.$transaction(async (tx) => {
      const fallback = await resolveInitialFeedbackCategory(tx, item.businessId, null);
      const result = await tx.feedback.updateMany({
        where: activeOperationalFeedbackWhere({
          id: item.id,
          businessId: item.businessId,
          categoryId: null,
          fieldStates: {
            none: {
              field: FeedbackFieldStateField.CATEGORY,
              source: {
                in: [FeedbackFieldStateSource.HUMAN, FeedbackFieldStateSource.AUTOMATION]
              }
            }
          }
        }),
        data: { categoryId: fallback.categoryId }
      });
      if (result.count !== 1) return false;

      await tx.feedbackFieldState.upsert({
        where: {
          feedbackId_field: {
            feedbackId: item.id,
            field: FeedbackFieldStateField.CATEGORY
          }
        },
        create: {
          businessId: item.businessId,
          feedbackId: item.id,
          field: FeedbackFieldStateField.CATEGORY,
          source: FeedbackFieldStateSource.DEFAULT
        },
        update: {
          source: FeedbackFieldStateSource.DEFAULT,
          sourceRuleId: null,
          updatedByMembershipId: null
        }
      });
      return true;
    });

    if (changed) updatedIds.push(item.id);
  }

  for (const feedbackId of updatedIds) {
    await scheduleAnalysisForFeedback(feedbackId);
  }

  console.log(JSON.stringify({ updated: updatedIds.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Category backfill failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
