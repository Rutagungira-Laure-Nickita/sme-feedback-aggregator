import { z } from "zod";
import { apiClient } from "../../../api/axios.js";
import type { SafeUser } from "../../auth/types/authTypes.js";
import type {
  BranchStatus,
  BranchSummary,
  BusinessDetail,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessPermissions,
  BusinessStatus,
  InvitationPreview,
  ManualFeedbackResult,
  MembershipSummary,
  MyBusiness,
  Pagination,
  PublicFeedbackQrCode,
  PublicFeedbackQrCodeList,
  PublicFeedbackSettings,
  StaffInvitationStatus,
  StaffInvitationSummary
} from "../types.js";
import type {
  BranchFormValues,
  BusinessSettingsValues,
  BusinessSetupValues,
  InviteStaffValues,
  ManualFeedbackValues,
  MembershipBranchAccessValues,
  PublicFeedbackSettingsValues,
  QrCodeCreateValues,
  QrCodeRenameValues
} from "../schemas.js";

const apiResponseSchema = <TData extends z.ZodTypeAny>(dataSchema: TData) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema
  });

const paginationSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number()
});

const businessSchema = z.object({}).passthrough();
const branchSchema = z.object({}).passthrough();
const membershipSchema = z.object({}).passthrough();
const invitationSchema = z.object({}).passthrough();

const myBusinessesResponseSchema = apiResponseSchema(
  z.object({
    businesses: z.array(businessSchema),
    pagination: paginationSchema
  })
);

const businessResponseSchema = apiResponseSchema(
  z.object({
    business: businessSchema,
    membership: membershipSchema.optional(),
    permissions: z.object({}).passthrough().optional()
  })
);

const branchesResponseSchema = apiResponseSchema(
  z.object({
    branches: z.array(branchSchema),
    pagination: paginationSchema
  })
);

const branchResponseSchema = apiResponseSchema(z.object({ branch: branchSchema }));

const membershipsResponseSchema = apiResponseSchema(
  z.object({
    memberships: z.array(membershipSchema),
    pagination: paginationSchema
  })
);

const membershipResponseSchema = apiResponseSchema(
  z.object({ membership: membershipSchema })
);

const invitationsResponseSchema = apiResponseSchema(
  z.object({
    invitations: z.array(invitationSchema),
    pagination: paginationSchema
  })
);

const invitationResponseSchema = apiResponseSchema(
  z.object({ invitation: invitationSchema })
);

const invitationPreviewResponseSchema = apiResponseSchema(
  z.object({ invitation: z.object({}).passthrough() })
);

const authUserResponseSchema = apiResponseSchema(
  z.object({
    user: z.object({}).passthrough(),
    businessId: z.string()
  })
);

const manualFeedbackResponseSchema = apiResponseSchema(
  z.object({
    feedbackId: z.string(),
    ingestionId: z.string(),
    businessId: z.string(),
    branchId: z.string(),
    channel: z.literal("MANUAL"),
    created: z.boolean(),
    duplicate: z.boolean(),
    processedAt: z.string()
  })
);

const publicFeedbackSettingsResponseSchema = apiResponseSchema(
  z.object({
    enabled: z.boolean(),
    welcomeMessage: z.string().nullable(),
    publicUrl: z.string().nullable(),
    hasToken: z.boolean(),
    updatedAt: z.string()
  })
);

const publicFeedbackQrCodeSchema = z.object({
  id: z.string(),
  name: z.string(),
  scope: z.enum(["BUSINESS_WIDE", "BRANCH"]),
  branch: z
    .object({
      id: z.string(),
      name: z.string()
    })
    .nullable(),
  publicUrl: z.string(),
  isActive: z.boolean(),
  isValidForCurrentPortal: z.boolean(),
  availabilityStatus: z.enum([
    "AVAILABLE",
    "QR_DISABLED",
    "PORTAL_DISABLED",
    "PORTAL_LINK_CHANGED",
    "BRANCH_INACTIVE"
  ]),
  createdAt: z.string(),
  updatedAt: z.string()
});

const publicFeedbackQrCodesResponseSchema = apiResponseSchema(
  z.object({
    portal: z.object({
      enabled: z.boolean(),
      publicUrl: z.string().nullable(),
      hasToken: z.boolean()
    }),
    qrCodes: z.array(publicFeedbackQrCodeSchema)
  })
);

const publicFeedbackQrCodeResponseSchema = apiResponseSchema(publicFeedbackQrCodeSchema);

export async function fetchMyBusinesses(
  params: {
    search?: string;
    status?: BusinessStatus;
    page?: number;
    pageSize?: number;
  } = {}
): Promise<{ businesses: MyBusiness[]; pagination: Pagination }> {
  const response = await apiClient.get<unknown>("/businesses/mine", { params });
  const data = myBusinessesResponseSchema.parse(response.data).data;

  return {
    businesses: data.businesses as MyBusiness[],
    pagination: data.pagination
  };
}

export async function createBusinessFromSetup(values: BusinessSetupValues): Promise<{
  business: BusinessDetail;
}> {
  const payload = {
    name: values.name,
    industry: values.industry,
    description: values.description,
    email: values.email,
    phone: values.phone,
    website: values.website,
    logoUrl: values.logoUrl,
    country: values.country,
    city: values.city,
    district: values.district,
    addressLine: values.addressLine,
    timezone: values.timezone,
    primaryBranch: {
      name: values.primaryBranchName,
      code: values.primaryBranchCode,
      addressLine: values.primaryBranchAddressLine,
      city: values.primaryBranchCity,
      district: values.primaryBranchDistrict,
      country: values.primaryBranchCountry,
      phone: values.primaryBranchPhone,
      email: values.primaryBranchEmail
    }
  };
  const response = await apiClient.post<unknown>("/businesses", payload);

  return apiResponseSchema(z.object({ business: businessSchema })).parse(response.data)
    .data as { business: BusinessDetail };
}

export async function fetchBusiness(businessId: string): Promise<{
  business: BusinessDetail;
  membership: MembershipSummary;
  permissions: BusinessPermissions;
}> {
  const response = await apiClient.get<unknown>(`/businesses/${businessId}`);

  return businessResponseSchema.parse(response.data).data as {
    business: BusinessDetail;
    membership: MembershipSummary;
    permissions: BusinessPermissions;
  };
}

export async function updateBusinessProfile(
  businessId: string,
  values: BusinessSettingsValues
): Promise<{ business: BusinessDetail }> {
  const response = await apiClient.patch<unknown>(`/businesses/${businessId}`, values);

  return businessResponseSchema.parse(response.data).data as {
    business: BusinessDetail;
  };
}

export async function fetchBranches(
  businessId: string,
  params: { search?: string; status?: BranchStatus } = {}
): Promise<{ branches: BranchSummary[]; pagination: Pagination }> {
  const response = await apiClient.get<unknown>(`/businesses/${businessId}/branches`, {
    params
  });
  const data = branchesResponseSchema.parse(response.data).data;

  return {
    branches: data.branches as BranchSummary[],
    pagination: data.pagination
  };
}

export async function fetchBranch(
  businessId: string,
  branchId: string
): Promise<BranchSummary> {
  const response = await apiClient.get<unknown>(
    `/businesses/${businessId}/branches/${branchId}`
  );

  return branchResponseSchema.parse(response.data).data.branch as BranchSummary;
}

export async function createBranchForBusiness(
  businessId: string,
  values: BranchFormValues
): Promise<BranchSummary> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/branches`,
    values
  );

  return branchResponseSchema.parse(response.data).data.branch as BranchSummary;
}

export async function updateBranchForBusiness(
  businessId: string,
  branchId: string,
  values: BranchFormValues
): Promise<BranchSummary> {
  const { isPrimary: _isPrimary, ...payload } = values;
  const response = await apiClient.patch<unknown>(
    `/businesses/${businessId}/branches/${branchId}`,
    payload
  );

  return branchResponseSchema.parse(response.data).data.branch as BranchSummary;
}

export async function setPrimaryBranchForBusiness(
  businessId: string,
  branchId: string
): Promise<void> {
  await apiClient.post(`/businesses/${businessId}/branches/${branchId}/set-primary`);
}

export async function setBranchStatus(
  businessId: string,
  branchId: string,
  status: BranchStatus
): Promise<void> {
  const action = status === "ACTIVE" ? "activate" : "deactivate";
  await apiClient.post(`/businesses/${businessId}/branches/${branchId}/${action}`);
}

export async function fetchMemberships(
  businessId: string,
  params: {
    search?: string;
    role?: BusinessMemberRole;
    status?: BusinessMembershipStatus;
    branchId?: string;
  } = {}
): Promise<{ memberships: MembershipSummary[]; pagination: Pagination }> {
  const response = await apiClient.get<unknown>(`/businesses/${businessId}/memberships`, {
    params
  });
  const data = membershipsResponseSchema.parse(response.data).data;

  return {
    memberships: data.memberships as MembershipSummary[],
    pagination: data.pagination
  };
}

export async function fetchMembership(
  businessId: string,
  membershipId: string
): Promise<MembershipSummary> {
  const response = await apiClient.get<unknown>(
    `/businesses/${businessId}/memberships/${membershipId}`
  );

  return membershipResponseSchema.parse(response.data).data
    .membership as MembershipSummary;
}

export async function updateMembershipRoleForBusiness(
  businessId: string,
  membershipId: string,
  role: BusinessMemberRole
): Promise<MembershipSummary> {
  const response = await apiClient.patch<unknown>(
    `/businesses/${businessId}/memberships/${membershipId}/role`,
    { role }
  );

  return membershipResponseSchema.parse(response.data).data
    .membership as MembershipSummary;
}

export async function updateMembershipBranchAccessForBusiness(
  businessId: string,
  membershipId: string,
  values: MembershipBranchAccessValues
): Promise<MembershipSummary> {
  const response = await apiClient.put<unknown>(
    `/businesses/${businessId}/memberships/${membershipId}/branch-access`,
    values
  );

  return membershipResponseSchema.parse(response.data).data
    .membership as MembershipSummary;
}

export async function setMembershipStatus(
  businessId: string,
  membershipId: string,
  action: "suspend" | "reactivate" | "remove"
): Promise<void> {
  if (action === "remove") {
    await apiClient.delete(`/businesses/${businessId}/memberships/${membershipId}`);
    return;
  }

  await apiClient.post(`/businesses/${businessId}/memberships/${membershipId}/${action}`);
}

export async function fetchInvitations(
  businessId: string,
  params: { search?: string; status?: StaffInvitationStatus } = {}
): Promise<{ invitations: StaffInvitationSummary[]; pagination: Pagination }> {
  const response = await apiClient.get<unknown>(`/businesses/${businessId}/invitations`, {
    params
  });
  const data = invitationsResponseSchema.parse(response.data).data;

  return {
    invitations: data.invitations as StaffInvitationSummary[],
    pagination: data.pagination
  };
}

export async function createStaffInvitationForBusiness(
  businessId: string,
  values: InviteStaffValues
): Promise<StaffInvitationSummary> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/invitations`,
    values
  );

  return invitationResponseSchema.parse(response.data).data
    .invitation as StaffInvitationSummary;
}

export async function resendInvitation(
  businessId: string,
  invitationId: string
): Promise<void> {
  await apiClient.post(`/businesses/${businessId}/invitations/${invitationId}/resend`);
}

export async function cancelInvitation(
  businessId: string,
  invitationId: string
): Promise<void> {
  await apiClient.delete(`/businesses/${businessId}/invitations/${invitationId}`);
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const response = await apiClient.get<unknown>("/business-invitations/preview", {
    params: { token }
  });

  return invitationPreviewResponseSchema.parse(response.data).data
    .invitation as InvitationPreview;
}

export async function acceptInvitationWithSession(token: string): Promise<{
  businessId: string;
}> {
  const response = await apiClient.post<unknown>("/business-invitations/accept/session", {
    token
  });

  return apiResponseSchema(z.object({ businessId: z.string() })).parse(response.data)
    .data;
}

export async function acceptInvitationWithPassword(values: {
  token: string;
  firstName: string;
  lastName: string;
  password: string;
}): Promise<{ user: SafeUser; businessId: string }> {
  const response = await apiClient.post<unknown>(
    "/business-invitations/accept/password",
    values
  );

  return authUserResponseSchema.parse(response.data).data as {
    user: SafeUser;
    businessId: string;
  };
}

export async function acceptInvitationWithGoogle(values: {
  token: string;
  credential: string;
}): Promise<{ user: SafeUser; businessId: string }> {
  const response = await apiClient.post<unknown>(
    "/business-invitations/accept/google",
    values
  );

  return authUserResponseSchema.parse(response.data).data as {
    user: SafeUser;
    businessId: string;
  };
}

export async function fetchAdminBusinesses(
  params: {
    search?: string;
    status?: BusinessStatus;
    sort?: "NEWEST" | "NAME" | "MOST_FEEDBACK";
  } = {}
): Promise<{ businesses: BusinessDetail[]; pagination: Pagination }> {
  const response = await apiClient.get<unknown>("/admin/businesses", { params });
  const data = apiResponseSchema(
    z.object({
      businesses: z.array(businessSchema),
      pagination: paginationSchema
    })
  ).parse(response.data).data;

  return {
    businesses: data.businesses as BusinessDetail[],
    pagination: data.pagination
  };
}

export async function fetchAdminBusiness(businessId: string): Promise<BusinessDetail> {
  const response = await apiClient.get<unknown>(`/admin/businesses/${businessId}`);

  return businessResponseSchema.parse(response.data).data.business as BusinessDetail;
}

export async function createAdminBusiness(input: {
  ownerUserId: string;
  name: string;
  industry: string;
  description?: string;
  email: string;
  phone: string;
  website?: string;
  country: string;
  city: string;
  district?: string;
  addressLine: string;
  timezone: string;
  primaryBranch: {
    name: string;
    code: string;
    addressLine: string;
    city: string;
    country: string;
  };
}): Promise<BusinessDetail> {
  const response = await apiClient.post<unknown>("/admin/businesses", input);
  return businessResponseSchema.parse(response.data).data.business as BusinessDetail;
}

export async function updateAdminBusiness(
  businessId: string,
  input: Partial<
    Pick<
      BusinessDetail,
      | "name"
      | "industry"
      | "description"
      | "email"
      | "phone"
      | "website"
      | "country"
      | "city"
      | "district"
      | "addressLine"
      | "timezone"
    >
  >
): Promise<BusinessDetail> {
  const response = await apiClient.patch<unknown>(
    `/admin/businesses/${businessId}`,
    input
  );
  return businessResponseSchema.parse(response.data).data.business as BusinessDetail;
}

export async function setAdminBusinessStatus(
  businessId: string,
  status: BusinessStatus,
  reason?: string
): Promise<void> {
  await apiClient.post(`/admin/businesses/${businessId}/status`, { status, reason });
}

export async function submitManualFeedbackForBusiness(
  businessId: string,
  values: ManualFeedbackValues,
  idempotencyKey: string
): Promise<ManualFeedbackResult> {
  const payload = {
    branchId: values.branchId,
    categoryId: values.categoryId,
    title: values.title,
    message: values.message,
    rating: values.rating,
    occurredAt: values.occurredAt ? new Date(values.occurredAt).toISOString() : undefined,
    languageCode: values.languageCode,
    customer:
      values.customerName || values.customerEmail || values.customerPhone
        ? {
            name: values.customerName,
            email: values.customerEmail,
            phone: values.customerPhone
          }
        : undefined,
    source: {
      type: values.sourceType,
      note: values.sourceNote,
      reference: values.sourceReference,
      sourceUrl: values.sourceUrl
    },
    attachments: values.attachments.length > 0 ? values.attachments : undefined
  };
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/feedback/manual`,
    payload,
    {
      headers: {
        "Idempotency-Key": idempotencyKey
      }
    }
  );

  return manualFeedbackResponseSchema.parse(response.data).data;
}

export async function fetchPublicFeedbackSettings(
  businessId: string
): Promise<PublicFeedbackSettings> {
  const response = await apiClient.get<unknown>(
    `/businesses/${businessId}/public-feedback`
  );

  return publicFeedbackSettingsResponseSchema.parse(response.data).data;
}

export async function updatePublicFeedbackSettings(
  businessId: string,
  values: PublicFeedbackSettingsValues
): Promise<PublicFeedbackSettings> {
  const response = await apiClient.patch<unknown>(
    `/businesses/${businessId}/public-feedback`,
    {
      enabled: values.enabled,
      welcomeMessage: values.welcomeMessage
    }
  );

  return publicFeedbackSettingsResponseSchema.parse(response.data).data;
}

export async function regeneratePublicFeedbackLink(
  businessId: string
): Promise<PublicFeedbackSettings> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/public-feedback/regenerate`
  );

  return publicFeedbackSettingsResponseSchema.parse(response.data).data;
}

export async function fetchPublicFeedbackQrCodes(
  businessId: string
): Promise<PublicFeedbackQrCodeList> {
  const response = await apiClient.get<unknown>(
    `/businesses/${businessId}/public-feedback/qr-codes`
  );

  return publicFeedbackQrCodesResponseSchema.parse(response.data)
    .data as PublicFeedbackQrCodeList;
}

export async function createPublicFeedbackQrCode(
  businessId: string,
  values: QrCodeCreateValues
): Promise<PublicFeedbackQrCode> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/public-feedback/qr-codes`,
    {
      name: values.name,
      branchId: values.scope === "BRANCH" ? values.branchId : undefined
    }
  );

  return publicFeedbackQrCodeResponseSchema.parse(response.data)
    .data as PublicFeedbackQrCode;
}

export async function regeneratePublicFeedbackQrCode(
  businessId: string,
  qrCodeId: string
): Promise<PublicFeedbackQrCode> {
  const response = await apiClient.post<unknown>(
    `/businesses/${businessId}/public-feedback/qr-codes/${qrCodeId}/regenerate`
  );

  return publicFeedbackQrCodeResponseSchema.parse(response.data)
    .data as PublicFeedbackQrCode;
}

export async function updatePublicFeedbackQrCode(
  businessId: string,
  qrCodeId: string,
  values: Partial<QrCodeRenameValues & { isActive: boolean }>
): Promise<PublicFeedbackQrCode> {
  const response = await apiClient.patch<unknown>(
    `/businesses/${businessId}/public-feedback/qr-codes/${qrCodeId}`,
    values
  );

  return publicFeedbackQrCodeResponseSchema.parse(response.data)
    .data as PublicFeedbackQrCode;
}
