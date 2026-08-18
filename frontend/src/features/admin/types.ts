export type AdminPeriod = "7d" | "30d" | "90d" | "12m";
export type AdminReportType =
  "EXECUTIVE_PLATFORM" | "FEEDBACK_CUSTOMER_EXPERIENCE" | "OPERATIONS_SYSTEM_HEALTH";

export type AdminDashboard = {
  period: { preset: AdminPeriod; from: string; to: string; bucket: string };
  primaryKpis: Record<
    string,
    {
      value: number;
      context?: {
        current: number;
        previous: number;
        delta: number;
        percentage: number | null;
      };
      affectedBusinesses?: number;
    }
  >;
  secondaryMetrics: Record<string, number>;
  feedbackTrend: Array<{ date: string; count: number; previous: number }>;
  channelDistribution: Array<{ channel: string; count: number; percentage: number }>;
  channelTotal: number;
  businessGrowth: {
    series: Array<{ date: string; count: number }>;
    newThisMonth: number;
    active: number;
    inactive: number;
    comparison: {
      current: number;
      previous: number;
      delta: number;
      percentage: number | null;
    };
  };
  sentiment: {
    distribution: Array<{ sentiment: string; count: number }>;
    notAnalyzed: number;
    analyzed: number;
    completionRate: number | null;
    statuses: Array<{ status: string; count: number }>;
  };
  integrationAdoption: Array<{ provider: string; mode: string; count: number }>;
  integrationHealth: {
    distribution: Array<{ status: string; count: number }>;
    total: number;
    affectedBusinesses: number;
    affectedProviders: number;
  };
  actions: Array<{
    id: string;
    severity: "HIGH" | "MEDIUM";
    count: number;
    title: string;
    href: string;
  }>;
  recentActivity: Array<{
    id: string;
    event: string;
    business: { id: string; name: string };
    category: string;
    status: string;
    timestamp: string;
  }>;
  businessOverview: Array<{
    id: string;
    name: string;
    status: string;
    branches: number;
    users: number;
    feedback: number;
    liveChannels: number;
    needsAttention: boolean;
    lastActivity: string | null;
  }>;
};

export type AdminFilterOptions = {
  businesses: Array<{ id: string; name: string; status: string }>;
  branches: Array<{ id: string; businessId: string; name: string; status: string }>;
  categories: Array<{
    id: string;
    businessId: string;
    name: string;
    isActive: boolean;
  }>;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AdminUserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  businessMemberships: Array<{
    id: string;
    role: string;
    status: string;
    business: { id: string; name: string; status: string };
  }>;
};

export type AdminUserDetail = AdminUserRecord & {
  updatedAt: string;
  sessions: Array<{
    id: string;
    createdAt: string;
    lastUsedAt: string;
    expiresAt: string;
    revokedAt: string | null;
    ipAddress: string | null;
    userAgent: string | null;
  }>;
};

export type AdminFeedbackRecord = {
  id: string;
  title: string | null;
  message: string;
  channel: string;
  status: string;
  priority: string;
  rating: number | null;
  receivedAt: string;
  business: { id: string; name: string };
  branch: { id: string; name: string };
  category: { id: string; name: string } | null;
  aiAnalysis: {
    status: string;
    sentiment: string | null;
    sentimentConfidence?: number | null;
    sentimentExplanation?: string | null;
    summary?: string | null;
    detectedLanguage?: string | null;
    suggestedCategoryId?: string | null;
    categoryConfidence?: number | null;
    provider?: string;
    model?: string;
    completedAt?: string | null;
  } | null;
};

export type AdminFeedbackDetail = AdminFeedbackRecord & {
  externalId: string | null;
  sourceUrl: string | null;
  sourceMetadata: Record<string, unknown> | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  assignedTo: {
    id: string;
    user: { id: string; firstName: string; lastName: string; email: string };
  } | null;
  attachments: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number | null;
    createdAt?: string;
  }>;
  ingestion: {
    id?: string;
    status: string;
    externalId: string | null;
    errorCode: string | null;
    createdAt?: string;
  };
  activities: Array<{
    id: string;
    type: string;
    note: string | null;
    createdAt: string;
    actor?: { user?: { firstName: string; lastName: string; email: string } } | null;
  }>;
};

export type AdminIntegrationRecord = {
  id: string;
  provider: string;
  mode: string;
  status: string;
  health: string;
  displayName: string;
  liveProviderType: string | null;
  requiresReauthorization: boolean;
  webhookStatus: string | null;
  lastInboundMessageAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastAttemptedSyncAt: string | null;
  lastErrorCode: string | null;
  totalImported: number;
  connectedAt?: string | null;
  createdAt?: string;
  business: { id: string; name: string; status: string };
  defaultBranch: { id: string; name: string; status: string };
  synchronizationRuns: Array<{
    status: string;
    completedAt: string | null;
    itemsImported: number;
    itemsDuplicated: number;
    itemsSkipped: number;
    itemsFailed: number;
    errorCode: string | null;
  }>;
};

export type AdminIntegrationDetail = Omit<
  AdminIntegrationRecord,
  "synchronizationRuns"
> & {
  synchronizationRuns: Array<
    AdminIntegrationRecord["synchronizationRuns"][number] & {
      id: string;
      startedAt: string | null;
      safeSummary: string | null;
    }
  >;
  webhookDeliveries: Array<{
    id: string;
    status: string;
    receivedAt: string;
    processedAt: string | null;
    resultCode: string | null;
    safeMessage: string | null;
  }>;
};

export type AdminSystemHealth = {
  checkedAt: string;
  api: { status: string; detail: string };
  database: { status: string; detail: string };
  workers: Record<
    string,
    { states: Array<{ status: string; count: number }>; staleProcessing: number }
  >;
  recentWebhookActivity: Array<{ status: string; count: number }>;
  note: string;
};

export type ReportDocument = {
  branding: {
    platformName: string;
    primaryColor: string;
    reportFooterText: string;
    reportSubtitle?: "PLATFORM ADMINISTRATION" | "BUSINESS REPORTING";
  };
  title: string;
  reportType: string;
  scope: {
    level: "PLATFORM" | "BUSINESS" | "BRANCH";
    label: string;
    notes: string[];
    metrics: Record<
      | "businesses"
      | "branches"
      | "users"
      | "customers"
      | "feedback"
      | "integrations"
      | "approvalWorkload",
      | "PLATFORM_WIDE"
      | "BUSINESS_SCOPED"
      | "BRANCH_SCOPED"
      | "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE"
    >;
  };
  period: { from: string; to: string };
  generatedAt: string;
  filters: string[];
  managementSummary: string;
  highlights: Array<{ label: string; value: string | number }>;
  sections: Array<{
    title: string;
    description?: string;
    headers: string[];
    rows: Array<Array<string | number | null>>;
    emptyMessage?: string;
    semantic?: "SENTIMENT" | "HEALTH";
  }>;
  comparison?: Array<{
    label: string;
    current: number;
    previous: number;
    absoluteChange: number;
    percentageChange: number | null;
    percentageLabel: string;
  }>;
};

export type ReportRequest = {
  reportType: AdminReportType;
  dateFrom: string;
  dateTo: string;
  businessId?: string;
  branchId?: string;
  channel?: string;
  status?: string;
  sentiment?: string;
  provider?: string;
  comparePreviousPeriod: boolean;
};
