import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy } from "react";
import {
  AccountPage,
  ActiveSessionsPage,
  ForgotPasswordPage,
  LoginPage,
  PasswordResetSuccessPage,
  ProtectedRoute,
  PublicOnlyRoute,
  RegisterPage,
  ResetPasswordPage,
  VerificationPendingPage,
  VerifyEmailPage
} from "../../features/auth/index.js";
import { RoleGuard } from "../../features/auth/components/RoleGuard.js";
import { LazyRoute } from "./LazyRoute.js";
import { IntegrationsCanonicalRedirect } from "./IntegrationsCanonicalRedirect.js";
import { HealthStatusPage } from "../../features/health/pages/HealthStatusPage.js";
import {
  AboutPage,
  ContactPage,
  FeaturesPage,
  HowItWorksPage,
  PrivacyPolicyPage,
  TermsOfServicePage
} from "../../features/public/index.js";
import { NotFoundPage, RouteErrorPage } from "./RouteErrorPage.js";
import { RootRedirect } from "./RootRedirect.js";
import { PublicLayout } from "../../features/public/components/PublicLayout.js";

const BusinessIndexPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BusinessIndexPage
  }))
);
const PublicFeedbackPage = lazy(() =>
  import("../../features/public-feedback/index.js").then((module) => ({
    default: module.PublicFeedbackPage
  }))
);
const BusinessSetupPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BusinessSetupPage
  }))
);
const BusinessOverviewPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BusinessOverviewPage
  }))
);
const BusinessSettingsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BusinessSettingsPage
  }))
);
const ManualFeedbackPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.ManualFeedbackPage
  }))
);
const QrCodesPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.QrCodesPage
  }))
);
const BranchesPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BranchesPage
  }))
);
const BranchFormPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BranchFormPage
  }))
);
const BranchDetailsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BranchDetailsPage
  }))
);
const StaffListPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.StaffListPage
  }))
);
const StaffDetailsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.StaffDetailsPage
  }))
);
const BranchAssignmentPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BranchAssignmentPage
  }))
);
const InvitationsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.InvitationsPage
  }))
);
const InviteStaffPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.InviteStaffPage
  }))
);
const InvitationAcceptPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.InvitationAcceptPage
  }))
);
const FeedbackInboxWrapper = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.FeedbackInboxWrapper
  }))
);
const CustomersPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.CustomersPage
  }))
);
const CustomerDetailPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.CustomerDetailPage
  }))
);
const AutomationsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.AutomationsPage
  }))
);
const IntegrationsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.IntegrationsPage
  }))
);
const BusinessReportsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.BusinessReportsPage
  }))
);
const AdminBusinessesPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.AdminBusinessesPage
  }))
);
const AdminBusinessDetailsPage = lazy(() =>
  import("../../features/businesses/index.js").then((module) => ({
    default: module.AdminBusinessDetailsPage
  }))
);
const AdminDashboardPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminDashboardPage
  }))
);
const AdminUsersPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminUsersPage
  }))
);
const AdminFeedbackPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminFeedbackPage
  }))
);
const AdminIntegrationsPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminIntegrationsPage
  }))
);
const AdminReportsPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminReportsPage
  }))
);
const AdminSystemHealthPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminSystemHealthPage
  }))
);
const AdminSettingsPage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminSettingsPage
  }))
);
const AdminBusinessCreatePage = lazy(() =>
  import("../../features/admin/index.js").then((module) => ({
    default: module.AdminBusinessCreatePage
  }))
);

export const router = createBrowserRouter([
  {
    path: "/",
    errorElement: <RouteErrorPage />,
    children: [
      {
        index: true,
        element: <RootRedirect />
      },
      {
        path: "features",
        element: <FeaturesPage />
      },
      {
        path: "how-it-works",
        element: <HowItWorksPage />
      },
      {
        path: "about",
        element: <AboutPage />
      },
      {
        path: "contact",
        element: <ContactPage />
      },
      {
        path: "privacy-policy",
        element: <PrivacyPolicyPage />
      },
      {
        path: "terms-of-service",
        element: <TermsOfServicePage />
      },
      {
        path: "feedback/:portalToken",
        element: (
          <LazyRoute>
            <PublicFeedbackPage />
          </LazyRoute>
        )
      },
      {
        path: "feedback/qr/:qrToken",
        element: (
          <LazyRoute>
            <PublicFeedbackPage />
          </LazyRoute>
        )
      },
      {
        path: "login",
        element: (
          <PublicLayout>
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          </PublicLayout>
        )
      },
      {
        path: "register",
        element: (
          <PublicLayout>
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          </PublicLayout>
        )
      },
      {
        path: "verify-email-pending",
        element: <VerificationPendingPage />
      },
      {
        path: "verify-email",
        element: <VerifyEmailPage />
      },
      {
        path: "forgot-password",
        element: <ForgotPasswordPage />
      },
      {
        path: "reset-password",
        element: <ResetPasswordPage />
      },
      {
        path: "password-reset-success",
        element: <PasswordResetSuccessPage />
      },
      {
        path: "account",
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        )
      },
      {
        path: "account/sessions",
        element: (
          <ProtectedRoute>
            <ActiveSessionsPage />
          </ProtectedRoute>
        )
      },
      {
        path: "business",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BusinessIndexPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/setup",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BusinessSetupPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BusinessOverviewPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/settings",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BusinessSettingsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/feedback/manual",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <ManualFeedbackPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/feedback/qr-codes",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <QrCodesPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/feedback",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <FeedbackInboxWrapper />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/customers",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <CustomersPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/customers/:customerId",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <CustomerDetailPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/automations",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <AutomationsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/integrations",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <IntegrationsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/integrations/:connectionId",
        element: (
          <ProtectedRoute>
            <IntegrationsCanonicalRedirect />
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/integrations/:connectionId/history",
        element: (
          <ProtectedRoute>
            <IntegrationsCanonicalRedirect />
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/integration-runs/:runId",
        element: (
          <ProtectedRoute>
            <IntegrationsCanonicalRedirect />
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/reports",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BusinessReportsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/branches",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BranchesPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/branches/new",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BranchFormPage mode="create" />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/branches/:branchId",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BranchDetailsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/branches/:branchId/edit",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BranchFormPage mode="edit" />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/staff",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <StaffListPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/staff/invite",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <InviteStaffPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/staff/:membershipId",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <StaffDetailsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/staff/:membershipId/branches",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <BranchAssignmentPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "business/:businessId/invitations",
        element: (
          <ProtectedRoute>
            <LazyRoute>
              <InvitationsPage />
            </LazyRoute>
          </ProtectedRoute>
        )
      },
      {
        path: "invitations/accept",
        element: (
          <LazyRoute>
            <InvitationAcceptPage />
          </LazyRoute>
        )
      },
      {
        path: "admin",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminDashboardPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/businesses",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminBusinessesPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/users",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminUsersPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/feedback",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminFeedbackPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/integrations",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminIntegrationsPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/reports",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminReportsPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/platform-health",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminSystemHealthPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/system-health",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <Navigate to="/admin/platform-health" replace />
          </RoleGuard>
        )
      },
      {
        path: "admin/settings",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminSettingsPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/businesses/new",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminBusinessCreatePage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "admin/businesses/:businessId",
        element: (
          <RoleGuard allowedRoles={["PLATFORM_ADMIN"]}>
            <LazyRoute>
              <AdminBusinessDetailsPage />
            </LazyRoute>
          </RoleGuard>
        )
      },
      {
        path: "system-status",
        element: <HealthStatusPage />
      },
      {
        path: "*",
        element: <NotFoundPage />
      }
    ]
  }
]);
