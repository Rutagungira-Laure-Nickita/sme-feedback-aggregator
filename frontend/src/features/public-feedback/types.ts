export type PublicFeedbackBranch = {
  id: string;
  name: string;
  location: string;
};

export type PublicFeedbackPortal = {
  business: {
    name: string;
    logoUrl: string | null;
  };
  portal: {
    welcomeMessage: string | null;
  };
  qrCode?: {
    scope: "BUSINESS_WIDE" | "BRANCH";
    name: string;
  };
  branches: PublicFeedbackBranch[];
  fixedBranchId?: string | null;
};

export type PublicFeedbackResult = {
  feedbackId: string;
  ingestionId: string;
  businessId: string;
  branchId: string;
  channel: "PUBLIC_FORM" | "QR_CODE";
  created: boolean;
  duplicate: boolean;
  processedAt: string;
};
