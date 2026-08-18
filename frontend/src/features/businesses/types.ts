export type BusinessStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "ARCHIVED";
export type BranchStatus = "ACTIVE" | "INACTIVE";
export type BusinessMemberRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF";
export type BusinessMembershipStatus = "ACTIVE" | "SUSPENDED" | "REMOVED";
export type StaffInvitationStatus = "PENDING" | "ACCEPTED" | "CANCELLED" | "EXPIRED";
export type ManualSourceType =
  | "PHONE_CALL"
  | "IN_PERSON"
  | "SUGGESTION_BOX"
  | "SMS"
  | "EMAIL_COPY"
  | "SOCIAL_MEDIA_COPY"
  | "OTHER";

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type BusinessSummary = {
  id: string;
  name: string;
  industry: string;
  email: string;
  phone: string;
  website: string | null;
  logoUrl: string | null;
  country: string;
  city: string;
  district: string | null;
  addressLine: string;
  timezone: string;
  status: BusinessStatus;
  createdAt: string;
  updatedAt: string;
  counts: {
    branches: number;
    activeBranches: number;
    staff: number;
    pendingInvitations: number;
  };
};

export type BranchSummary = {
  id: string;
  businessId: string;
  name: string;
  code: string;
  addressLine: string;
  city: string;
  district: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
  status: BranchStatus;
  staffCount: number;
  createdAt: string;
  updatedAt: string;
};

export type MembershipSummary = {
  id: string;
  businessId: string;
  userId: string;
  role: BusinessMemberRole;
  status: BusinessMembershipStatus;
  allBranchesAccess: boolean;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    platformRole: string;
  } | null;
  branches: {
    id: string;
    name: string;
    code: string;
    status: BranchStatus;
  }[];
};

export type StaffInvitationSummary = {
  id: string;
  businessId: string;
  invitedEmail: string;
  role: BusinessMemberRole;
  status: StaffInvitationStatus;
  allBranchesAccess: boolean;
  expiresAt: string;
  acceptedAt: string | null;
  cancelledAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
  branches: {
    id: string;
    name: string;
    code: string;
    status: BranchStatus;
  }[];
  invitedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  acceptedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export type BusinessDetail = BusinessSummary & {
  description: string | null;
  primaryBranch: BranchSummary | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  adminOverview?: {
    branches: Array<{
      id: string;
      name: string;
      code: string;
      status: BranchStatus;
      isPrimary: boolean;
    }>;
    memberships: Array<{
      id: string;
      role: BusinessMemberRole;
      status: BusinessMembershipStatus;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      } | null;
    }>;
    feedbackByStatus: Array<{ status: string; count: number }>;
    totalFeedback: number;
    integrations: Array<{
      provider: string;
      mode: string;
      status: string;
      totalImported: number;
      lastSuccessfulSyncAt: string | null;
      lastInboundMessageAt: string | null;
    }>;
    recentFeedback: Array<{
      id: string;
      channel: string;
      status: string;
      receivedAt: string;
      branch: { id: string; name: string };
    }>;
  };
};

export type MyBusiness = BusinessSummary & {
  membership: MembershipSummary;
};

export type BusinessPermissions = {
  canManageBusiness: boolean;
  canManageBranches: boolean;
  canManageStaff: boolean;
  canAssignAdmin: boolean;
};

export type InvitationPreview = {
  business: {
    id: string;
    name: string;
    logoUrl: string | null;
    city: string;
    country: string;
  };
  invitedEmail: string;
  role: BusinessMemberRole;
  allBranchesAccess: boolean;
  branches: {
    id: string;
    name: string;
    code: string;
  }[];
  invitedBy: {
    firstName: string;
    lastName: string;
  };
  expiresAt: string;
};

export type ManualFeedbackResult = {
  feedbackId: string;
  ingestionId: string;
  businessId: string;
  branchId: string;
  channel: "MANUAL";
  created: boolean;
  duplicate: boolean;
  processedAt: string;
};

export type PublicFeedbackSettings = {
  enabled: boolean;
  welcomeMessage: string | null;
  publicUrl: string | null;
  hasToken: boolean;
  updatedAt: string;
};

export type PublicFeedbackQrScope = "BUSINESS_WIDE" | "BRANCH";

export type PublicFeedbackQrAvailabilityStatus =
  | "AVAILABLE"
  | "QR_DISABLED"
  | "PORTAL_DISABLED"
  | "PORTAL_LINK_CHANGED"
  | "BRANCH_INACTIVE";

export type PublicFeedbackQrCode = {
  id: string;
  name: string;
  scope: PublicFeedbackQrScope;
  branch: {
    id: string;
    name: string;
  } | null;
  publicUrl: string;
  isActive: boolean;
  isValidForCurrentPortal: boolean;
  availabilityStatus: PublicFeedbackQrAvailabilityStatus;
  createdAt: string;
  updatedAt: string;
};

export type PublicFeedbackQrCodeList = {
  portal: {
    enabled: boolean;
    publicUrl: string | null;
    hasToken: boolean;
  };
  qrCodes: PublicFeedbackQrCode[];
};
