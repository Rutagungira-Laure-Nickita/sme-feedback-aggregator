import { createHash } from "node:crypto";
import {
  FeedbackChannel,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationProvider
} from "../../lib/prisma-runtime.js";
import { canonicalStringify } from "../feedback-processing/feedback-hash.service.js";
import type { NormalizedFeedbackInput } from "../feedback-processing/index.js";
import type {
  ConnectorHealth,
  DemoExternalFeedbackItem,
  ExternalFeedbackConnector,
  IntegrationConnectionContext,
  IntegrationProviderCapabilities,
  SafeExternalItemPreview
} from "./integration.types.js";

const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  GOOGLE_REVIEWS: "Google Reviews",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  X: "X",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram"
};

const PROVIDER_CHANNELS: Record<IntegrationProvider, FeedbackChannel> = {
  GOOGLE_REVIEWS: FeedbackChannel.GOOGLE_REVIEW,
  WHATSAPP: FeedbackChannel.WHATSAPP,
  EMAIL: FeedbackChannel.EMAIL,
  X: FeedbackChannel.X,
  FACEBOOK: FeedbackChannel.FACEBOOK,
  INSTAGRAM: FeedbackChannel.INSTAGRAM
};

const PROVIDER_DESCRIPTIONS: Record<IntegrationProvider, string> = {
  GOOGLE_REVIEWS: "Simulated review import with star ratings and review text.",
  WHATSAPP: "Simulated inbound customer messages from a business chat channel.",
  EMAIL: "Simulated customer email messages with metadata-only attachments.",
  X: "Simulated public mentions and replies.",
  FACEBOOK: "Simulated page comments and recommendations.",
  INSTAGRAM: "Simulated comments and direct-message-style feedback."
};

export class DemoConnector implements ExternalFeedbackConnector {
  public readonly mode = IntegrationMode.DEMO;

  public constructor(
    public readonly provider: IntegrationProvider,
    private readonly standardItems: DemoExternalFeedbackItem[],
    private readonly partialFailureItems: DemoExternalFeedbackItem[]
  ) {}

  public supportsMode(mode: IntegrationMode): boolean {
    return mode === IntegrationMode.DEMO;
  }

  public getCapabilities(): IntegrationProviderCapabilities {
    return {
      provider: this.provider,
      mode: IntegrationMode.DEMO,
      label: PROVIDER_LABELS[this.provider],
      channel: PROVIDER_CHANNELS[this.provider],
      demoSupported: true,
      liveSupported: false,
      supportsRatings: this.provider === IntegrationProvider.GOOGLE_REVIEWS,
      supportsAttachments: this.provider === IntegrationProvider.EMAIL,
      description: PROVIDER_DESCRIPTIONS[this.provider]
    };
  }

  public async testConnection(
    _context: IntegrationConnectionContext
  ): Promise<ConnectorHealth> {
    return {
      ok: true,
      code: "DEMO_CONNECTION_READY",
      message: "Demo connection is ready. No real provider account is connected.",
      checkedAt: new Date()
    };
  }

  public async fetchDemoItems(
    context: IntegrationConnectionContext
  ): Promise<DemoExternalFeedbackItem[]> {
    return context.demoScenario === IntegrationDemoScenario.PARTIAL_FAILURE
      ? this.partialFailureItems
      : this.standardItems;
  }

  public async fetchItems(
    context: IntegrationConnectionContext
  ): Promise<DemoExternalFeedbackItem[]> {
    return this.fetchDemoItems(context);
  }

  public normalizeItem(
    item: DemoExternalFeedbackItem,
    context: IntegrationConnectionContext
  ): NormalizedFeedbackInput {
    if (item.invalidReason) {
      throw new Error(item.invalidReason);
    }

    return {
      businessId: context.businessId,
      branchId: context.defaultBranchId,
      channel: PROVIDER_CHANNELS[this.provider],
      externalId: item.externalId,
      idempotencyKey: `demo:${context.connectionId}:${item.externalId}`,
      title: item.title,
      message: item.message,
      rating: item.rating,
      occurredAt: item.occurredAt,
      sourceUrl: item.sourceUrl,
      customer: item.customer,
      attachments: item.attachments,
      metadata: {
        sourceType: "demo-external-feedback",
        provider: this.provider,
        providerLabel: PROVIDER_LABELS[this.provider],
        demoMode: true,
        simulatedExternalData: true,
        liveProviderConnected: false,
        connectionId: context.connectionId,
        connectionName: context.displayName,
        externalSourceItemId: item.externalId,
        externalReceivedAt: item.occurredAt,
        sourceLabel: item.sourceLabel,
        originalPreview: previewText(item.message),
        ...item.metadata
      }
    };
  }

  public getSafePreview(item: DemoExternalFeedbackItem): SafeExternalItemPreview {
    return {
      provider: this.provider,
      providerLabel: PROVIDER_LABELS[this.provider],
      sourceType: item.sourceLabel,
      author: item.authorName,
      textPreview: previewText(item.message),
      rating: item.rating ?? null,
      occurredAt: item.occurredAt,
      externalId: item.externalId,
      demoMode: true,
      simulatedExternalData: true
    };
  }

  public getPayloadHash(item: DemoExternalFeedbackItem): string {
    return createHash("sha256")
      .update(
        canonicalStringify({
          externalId: item.externalId,
          sourceLabel: item.sourceLabel,
          authorName: item.authorName,
          title: item.title ?? null,
          message: item.message,
          rating: item.rating ?? null,
          occurredAt: item.occurredAt,
          customer: item.customer ?? null,
          attachments: item.attachments ?? [],
          metadata: item.metadata
        })
      )
      .digest("hex");
  }
}

export function createDemoConnectors(): DemoConnector[] {
  return [
    new DemoConnector(
      IntegrationProvider.GOOGLE_REVIEWS,
      googleReviewItems,
      withPartialFailure(googleReviewItems, "demo-google-reviews-partial-invalid")
    ),
    new DemoConnector(
      IntegrationProvider.WHATSAPP,
      whatsappItems,
      withPartialFailure(whatsappItems, "demo-whatsapp-partial-invalid")
    ),
    new DemoConnector(
      IntegrationProvider.EMAIL,
      emailItems,
      withPartialFailure(emailItems, "demo-email-partial-invalid")
    ),
    new DemoConnector(
      IntegrationProvider.X,
      xItems,
      withPartialFailure(xItems, "demo-x-partial-invalid")
    ),
    new DemoConnector(
      IntegrationProvider.FACEBOOK,
      facebookItems,
      withPartialFailure(facebookItems, "demo-facebook-partial-invalid")
    ),
    new DemoConnector(
      IntegrationProvider.INSTAGRAM,
      instagramItems,
      withPartialFailure(instagramItems, "demo-instagram-partial-invalid")
    )
  ];
}

export function providerLabel(provider: IntegrationProvider): string {
  return PROVIDER_LABELS[provider];
}

export function providerChannel(provider: IntegrationProvider): FeedbackChannel {
  return PROVIDER_CHANNELS[provider];
}

function withPartialFailure(
  baseItems: DemoExternalFeedbackItem[],
  externalId: string
): DemoExternalFeedbackItem[] {
  return [
    ...baseItems.slice(0, 3),
    {
      externalId,
      sourceLabel: "Simulated invalid external item",
      authorName: "Demo Source",
      message: "",
      occurredAt: "2026-07-30T12:45:00.000Z",
      metadata: { demoFailure: true },
      invalidReason: "Demo item is intentionally invalid for partial-failure testing."
    }
  ];
}

function previewText(message: string): string {
  return message.length <= 180 ? message : `${message.slice(0, 177).trimEnd()}...`;
}

const googleReviewItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-google-reviews-standard-001",
    sourceLabel: "5-star review",
    authorName: "Aline N.",
    title: "Google review from Aline N.",
    message:
      "The team handled our lunch rush beautifully. Fast service, warm staff, and the sambaza plate was excellent.",
    rating: 5,
    occurredAt: "2026-07-30T08:25:00.000Z",
    customer: { name: "Aline N." },
    metadata: { originalRating: 5, locationLabel: "Demo location" }
  },
  {
    externalId: "demo-google-reviews-standard-002",
    sourceLabel: "3-star review",
    authorName: "Patrick M.",
    title: "Google review from Patrick M.",
    message:
      "The food was good, but the checkout line took longer than expected during the evening shift.",
    rating: 3,
    occurredAt: "2026-07-30T09:10:00.000Z",
    customer: { name: "Patrick M." },
    metadata: { originalRating: 3, locationLabel: "Demo location" }
  },
  {
    externalId: "demo-google-reviews-standard-003",
    sourceLabel: "2-star review",
    authorName: "Keza R.",
    title: "Google review from Keza R.",
    message:
      "My takeaway order was missing two items and no one picked up the phone when I tried to call.",
    rating: 2,
    occurredAt: "2026-07-30T10:30:00.000Z",
    customer: { name: "Keza R." },
    metadata: { originalRating: 2, locationLabel: "Demo location" }
  },
  {
    externalId: "demo-google-reviews-standard-004",
    sourceLabel: "4-star review",
    authorName: "Claude I.",
    title: "Google review from Claude I.",
    message:
      "Great atmosphere for a client meeting. Please add clearer signs for parking at the branch entrance.",
    rating: 4,
    occurredAt: "2026-07-30T11:05:00.000Z",
    customer: { name: "Claude I." },
    metadata: { originalRating: 4, locationLabel: "Demo location" }
  }
];

const whatsappItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-whatsapp-standard-001",
    sourceLabel: "Inbound WhatsApp complaint",
    authorName: "Mutesi C.",
    message:
      "Hello, I ordered breakfast at 8:10 and it arrived cold. Can someone check what happened?",
    occurredAt: "2026-07-30T07:58:00.000Z",
    customer: { name: "Mutesi C.", phone: "+250 788 120 441" },
    metadata: { direction: "inbound", conversationType: "support" }
  },
  {
    externalId: "demo-whatsapp-standard-002",
    sourceLabel: "Inbound WhatsApp request",
    authorName: "Bizimana J.",
    message: "Can I reserve a table for six people tonight at 7:30 near the window?",
    occurredAt: "2026-07-30T08:20:00.000Z",
    customer: { name: "Bizimana J.", phone: "+250 782 330 914" },
    metadata: { direction: "inbound", conversationType: "reservation" }
  },
  {
    externalId: "demo-whatsapp-standard-003",
    sourceLabel: "Inbound WhatsApp praise",
    authorName: "Iradukunda S.",
    message:
      "Thank you for helping with the birthday cake yesterday. The staff made it feel special.",
    occurredAt: "2026-07-30T09:45:00.000Z",
    customer: { name: "Iradukunda S.", phone: "+250 789 440 118" },
    metadata: { direction: "inbound", conversationType: "praise" }
  },
  {
    externalId: "demo-whatsapp-standard-004",
    sourceLabel: "Inbound WhatsApp question",
    authorName: "Ntwali P.",
    message:
      "Do you have gluten-free options available today, and can they be ordered for delivery?",
    occurredAt: "2026-07-30T10:15:00.000Z",
    customer: { name: "Ntwali P.", phone: "+250 783 650 772" },
    metadata: { direction: "inbound", conversationType: "question" }
  }
];

const emailItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-email-standard-001",
    sourceLabel: "Customer email",
    authorName: "Olivia K.",
    title: "Invoice and service feedback",
    message:
      "Hello team,\n\nThe catering was well organized, but the final invoice arrived with the wrong branch name. Please correct it before Friday.",
    occurredAt: "2026-07-29T09:15:00.000Z",
    customer: { name: "Olivia K.", email: "olivia.k@example.com" },
    attachments: [
      {
        filename: "invoice-note.txt",
        mimeType: "text/plain",
        sizeBytes: 428,
        metadata: { demoAttachment: true, source: "simulated-email" }
      }
    ],
    metadata: { subject: "Invoice and service feedback", mailbox: "demo-inbox" }
  },
  {
    externalId: "demo-email-standard-002",
    sourceLabel: "Customer email",
    authorName: "Jean P.",
    title: "Praise for delivery",
    message:
      "The delivery arrived early and the packaging was neat. Please thank the driver who handled the Kimironko order.",
    occurredAt: "2026-07-29T10:05:00.000Z",
    customer: { name: "Jean P.", email: "jean.p@example.com" },
    metadata: { subject: "Praise for delivery", mailbox: "demo-inbox" }
  },
  {
    externalId: "demo-email-standard-003",
    sourceLabel: "Customer email",
    authorName: "Diane U.",
    title: "Question about catering sizes",
    message:
      "Could you confirm whether the family tray serves ten people or twelve people? We need to plan for a workshop.",
    occurredAt: "2026-07-29T11:20:00.000Z",
    customer: { name: "Diane U.", email: "diane.u@example.com" },
    metadata: { subject: "Question about catering sizes", mailbox: "demo-inbox" }
  },
  {
    externalId: "demo-email-standard-004",
    sourceLabel: "Customer email",
    authorName: "Eric T.",
    title: "Order issue",
    message:
      "The drinks for our meeting arrived after the food, and the team had already started. Please review the dispatch timing.",
    occurredAt: "2026-07-29T12:10:00.000Z",
    customer: { name: "Eric T.", email: "eric.t@example.com" },
    metadata: { subject: "Order issue", mailbox: "demo-inbox" }
  }
];

const xItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-x-standard-001",
    sourceLabel: "Simulated mention",
    authorName: "demo_customer_one",
    message: "Loved the new lunch combo today. Quick service and good value.",
    occurredAt: "2026-07-28T14:20:00.000Z",
    customer: { name: "demo_customer_one" },
    metadata: { postType: "mention" }
  },
  {
    externalId: "demo-x-standard-002",
    sourceLabel: "Simulated reply",
    authorName: "demo_guest_two",
    message:
      "The queue at pickup was confusing. A separate sign for online orders would help.",
    occurredAt: "2026-07-28T15:05:00.000Z",
    customer: { name: "demo_guest_two" },
    metadata: { postType: "reply" }
  }
];

const facebookItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-facebook-standard-001",
    sourceLabel: "Simulated page comment",
    authorName: "Claudine A.",
    message:
      "The weekend brunch was lovely, especially the fruit selection and the friendly host.",
    occurredAt: "2026-07-28T16:00:00.000Z",
    customer: { name: "Claudine A." },
    metadata: { itemType: "page-comment" }
  },
  {
    externalId: "demo-facebook-standard-002",
    sourceLabel: "Simulated recommendation",
    authorName: "Samuel B.",
    message:
      "I recommend the branch for group meals, but parking coordination needs improvement.",
    occurredAt: "2026-07-28T17:25:00.000Z",
    customer: { name: "Samuel B." },
    metadata: { itemType: "recommendation" }
  }
];

const instagramItems: DemoExternalFeedbackItem[] = [
  {
    externalId: "demo-instagram-standard-001",
    sourceLabel: "Simulated comment",
    authorName: "demo_foodfan",
    message: "The new dessert presentation looks amazing. Is it available every day?",
    occurredAt: "2026-07-28T18:10:00.000Z",
    customer: { name: "demo_foodfan" },
    metadata: { itemType: "comment" }
  },
  {
    externalId: "demo-instagram-standard-002",
    sourceLabel: "Simulated direct message",
    authorName: "demo_visitorkigali",
    message:
      "We visited after seeing the post, but the advertised special was already sold out.",
    occurredAt: "2026-07-28T19:05:00.000Z",
    customer: { name: "demo_visitorkigali" },
    metadata: { itemType: "direct-message" }
  }
];
