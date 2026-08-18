export type ReportSection = {
  title: string;
  description?: string;
  headers: string[];
  rows: Array<Array<string | number | null>>;
  emptyMessage?: string;
  semantic?: "SENTIMENT" | "HEALTH";
};

export type ReportComparison = {
  label: string;
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number | null;
  percentageLabel: string;
};

export type AdminReportDocument = {
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
    metrics: {
      businesses: ReportMetricScope;
      branches: ReportMetricScope;
      users: ReportMetricScope;
      customers: ReportMetricScope;
      feedback: ReportMetricScope;
      integrations: ReportMetricScope;
      approvalWorkload: ReportMetricScope;
    };
  };
  period: { from: string; to: string };
  generatedAt: string;
  filters: string[];
  managementSummary: string;
  highlights: Array<{ label: string; value: string | number }>;
  sections: ReportSection[];
  comparison?: ReportComparison[];
};

export type ReportMetricScope =
  | "PLATFORM_WIDE"
  | "BUSINESS_SCOPED"
  | "BRANCH_SCOPED"
  | "BUSINESS_ONLY_NOT_BRANCH_SCOPABLE";
