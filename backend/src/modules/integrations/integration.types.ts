import type {
  EmailProviderType,
  FeedbackChannel,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationProvider
} from "@prisma/client";
import type {
  FeedbackAttachmentInput,
  JsonObject,
  NormalizedFeedbackInput
} from "../feedback-processing/index.js";

export type IntegrationConnectionContext = {
  connectionId: string;
  businessId: string;
  defaultBranchId: string;
  displayName: string;
  provider: IntegrationProvider;
  mode: IntegrationMode;
  demoScenario: IntegrationDemoScenario | null;
  liveProviderType?: EmailProviderType | null;
  providerAccountId?: string | null;
  providerAccountLabel?: string | null;
  synchronizationFolder?: string;
  lastProviderCursor?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessAccountId?: string | null;
  whatsappDisplayPhoneNumber?: string | null;
};

export type IntegrationProviderCapabilities = {
  provider: IntegrationProvider;
  mode: IntegrationMode;
  label: string;
  channel: FeedbackChannel;
  demoSupported: boolean;
  liveSupported: boolean;
  supportsRatings: boolean;
  supportsAttachments: boolean;
  description: string;
};

export type ConnectorHealth = {
  ok: boolean;
  code: string;
  message: string;
  checkedAt: Date;
  providerAccountLabel?: string | null;
};

export type SafeExternalItemPreview = JsonObject & {
  provider: string;
  sourceType: string;
  author: string;
  textPreview: string;
  demoMode?: boolean;
  liveMode?: boolean;
  simulatedExternalData?: boolean;
};

export type ExternalFeedbackItem = {
  externalId: string;
  sourceLabel: string;
  authorName: string;
  title?: string;
  message: string;
  rating?: number;
  occurredAt: string;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  sourceUrl?: string;
  attachments?: FeedbackAttachmentInput[];
  metadata: JsonObject;
  invalidReason?: string;
  skipReason?: string;
};

export type DemoExternalFeedbackItem = ExternalFeedbackItem;

export type ExternalFeedbackConnector = {
  readonly provider: IntegrationProvider;
  readonly mode: IntegrationMode;
  supportsMode(mode: IntegrationMode): boolean;
  getCapabilities(): IntegrationProviderCapabilities;
  testConnection(context: IntegrationConnectionContext): Promise<ConnectorHealth>;
  fetchItems(context: IntegrationConnectionContext): Promise<ExternalFeedbackItem[]>;
  fetchDemoItems(
    context: IntegrationConnectionContext
  ): Promise<DemoExternalFeedbackItem[]>;
  normalizeItem(
    item: ExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput;
  getSafePreview(item: ExternalFeedbackItem): SafeExternalItemPreview;
  getPayloadHash(item: ExternalFeedbackItem): string;
  onSyncComplete?(
    context: IntegrationConnectionContext,
    result: {
      status: string;
      latestCursor: string | null;
      completedAt: Date;
      failed: number;
    }
  ): Promise<void>;
  revokeAuthorization?(context: IntegrationConnectionContext): Promise<void>;
};
