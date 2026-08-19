import { createHash } from "node:crypto";
import {
  EmailProviderType,
  FeedbackChannel,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";
import { env } from "../../config/env.js";
import { canonicalStringify } from "../feedback-processing/feedback-hash.service.js";
import type { NormalizedFeedbackInput } from "../feedback-processing/index.js";
import { GmailLiveConnector } from "./gmail-live-connector.js";
import { OutlookLiveConnector } from "./outlook-live-connector.js";
import { INTEGRATION_ERRORS, IntegrationError } from "./integration.errors.js";
import type {
  ConnectorHealth,
  ExternalFeedbackConnector,
  ExternalFeedbackItem,
  IntegrationConnectionContext,
  IntegrationProviderCapabilities,
  SafeExternalItemPreview
} from "./integration.types.js";

export class EmailLiveConnector implements ExternalFeedbackConnector {
  public readonly provider = IntegrationProvider.EMAIL;
  public readonly mode = IntegrationMode.LIVE;

  private readonly gmail = new GmailLiveConnector();
  private readonly outlook = new OutlookLiveConnector();

  public supportsMode(mode: IntegrationMode): boolean {
    return mode === IntegrationMode.LIVE;
  }

  public getCapabilities(): IntegrationProviderCapabilities {
    return {
      provider: IntegrationProvider.EMAIL,
      mode: IntegrationMode.LIVE,
      label: "Email",
      channel: FeedbackChannel.EMAIL,
      demoSupported: false,
      liveSupported: env.LIVE_EMAIL_ENABLED || env.LIVE_OUTLOOK_ENABLED,
      supportsRatings: false,
      supportsAttachments: true,
      description:
        "Connect Gmail or Outlook with OAuth and import Inbox messages as feedback."
    };
  }

  public async testConnection(
    context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    return this.connectorForContext(context).testConnection(context);
  }

  public async fetchDemoItems(): Promise<ExternalFeedbackItem[]> {
    throw new IntegrationError(
      "Live Email uses the live synchronization path.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }

  public async fetchItems(
    context: IntegrationConnectionContext
  ): Promise<ExternalFeedbackItem[]> {
    return this.connectorForContext(context).fetchItems(context);
  }

  public normalizeItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput {
    return this.connectorForContext(context).normalizeItem(item, context);
  }

  public getSafePreview(item: ExternalFeedbackItem): SafeExternalItemPreview {
    return {
      provider: IntegrationProvider.EMAIL,
      providerLabel: "Email",
      sourceType: item.sourceLabel,
      author: item.authorName,
      textPreview: previewText(item.message),
      title: item.title ?? null,
      occurredAt: item.occurredAt,
      externalId: item.externalId,
      liveMode: true,
      demoMode: false,
      simulatedExternalData: false,
      attachmentCount: item.attachments?.length ?? 0
    };
  }

  public getPayloadHash(item: ExternalFeedbackItem): string {
    return createHash("sha256")
      .update(
        canonicalStringify({
          externalId: item.externalId,
          sourceLabel: item.sourceLabel,
          authorName: item.authorName,
          title: item.title ?? null,
          message: item.message,
          occurredAt: item.occurredAt,
          customer: item.customer ?? null,
          attachments: item.attachments ?? [],
          metadata: item.metadata
        })
      )
      .digest("hex");
  }

  public async onSyncComplete(
    context: IntegrationConnectionContext,
    result: {
      status: string;
      latestCursor: string | null;
      completedAt: Date;
      failed: number;
    }
  ): Promise<void> {
    await this.connectorForContext(context).onSyncComplete?.(context, result);
  }

  public async revokeAuthorization(context: IntegrationConnectionContext): Promise<void> {
    await this.connectorForContext(context).revokeAuthorization?.(context);
  }

  private connectorForContext(
    context: Pick<IntegrationConnectionContext, "liveProviderType">
  ): ExternalFeedbackConnector {
    if (context.liveProviderType === EmailProviderType.GMAIL) return this.gmail;
    if (context.liveProviderType === EmailProviderType.MICROSOFT) return this.outlook;
    throw new IntegrationError(
      "Choose Gmail or Outlook before using Live Email.",
      INTEGRATION_ERRORS.MODE_UNSUPPORTED,
      400
    );
  }
}

function previewText(message: string): string {
  return message.length <= 180 ? message : `${message.slice(0, 177).trimEnd()}...`;
}
