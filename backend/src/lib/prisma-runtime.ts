import prismaClientPackage from "@prisma/client";

export const {
  AccountStatus,
  AccountTokenType,
  AutomationActionExecutionStatus,
  AutomationActionType,
  AutomationConditionOperator,
  AutomationConditionType,
  AutomationEventStatus,
  AutomationExecutionStatus,
  AutomationRuleBranchScope,
  AutomationRuleMatchMode,
  AutomationRuleStatus,
  AutomationRuleTrigger,
  BranchStatus,
  BusinessMemberRole,
  BusinessMembershipStatus,
  BusinessStatus,
  CustomerActivityType,
  CustomerStatus,
  EmailProviderType,
  ExternalAuthProvider,
  FeedbackAIAnalysisStatus,
  FeedbackAISentiment,
  FeedbackActivityActorType,
  FeedbackActivityType,
  FeedbackChannel,
  FeedbackFieldStateField,
  FeedbackFieldStateSource,
  FeedbackIngestionStatus,
  FeedbackPriority,
  FeedbackStatus,
  IntegrationConnectionStatus,
  IntegrationCredentialType,
  IntegrationDemoScenario,
  IntegrationMode,
  IntegrationOAuthAction,
  IntegrationProvider,
  IntegrationWebhookDeliveryStatus,
  PlatformAppearance,
  Prisma,
  PrismaClient,
  StaffInvitationStatus,
  SynchronizationItemStatus,
  SynchronizationRunStatus,
  SynchronizationTriggerType,
  UserRole
} = prismaClientPackage;

type EnumValue<T> = T[keyof T];

export type AccountStatus = EnumValue<typeof AccountStatus>;
export type AccountTokenType = EnumValue<typeof AccountTokenType>;
export type AutomationActionExecutionStatus = EnumValue<
  typeof AutomationActionExecutionStatus
>;
export type AutomationActionType = EnumValue<typeof AutomationActionType>;
export type AutomationConditionOperator = EnumValue<typeof AutomationConditionOperator>;
export type AutomationConditionType = EnumValue<typeof AutomationConditionType>;
export type AutomationEventStatus = EnumValue<typeof AutomationEventStatus>;
export type AutomationExecutionStatus = EnumValue<typeof AutomationExecutionStatus>;
export type AutomationRuleBranchScope = EnumValue<typeof AutomationRuleBranchScope>;
export type AutomationRuleMatchMode = EnumValue<typeof AutomationRuleMatchMode>;
export type AutomationRuleStatus = EnumValue<typeof AutomationRuleStatus>;
export type AutomationRuleTrigger = EnumValue<typeof AutomationRuleTrigger>;
export type BranchStatus = EnumValue<typeof BranchStatus>;
export type BusinessMemberRole = EnumValue<typeof BusinessMemberRole>;
export type BusinessMembershipStatus = EnumValue<typeof BusinessMembershipStatus>;
export type BusinessStatus = EnumValue<typeof BusinessStatus>;
export type CustomerActivityType = EnumValue<typeof CustomerActivityType>;
export type CustomerStatus = EnumValue<typeof CustomerStatus>;
export type EmailProviderType = EnumValue<typeof EmailProviderType>;
export type ExternalAuthProvider = EnumValue<typeof ExternalAuthProvider>;
export type FeedbackAIAnalysisStatus = EnumValue<typeof FeedbackAIAnalysisStatus>;
export type FeedbackAISentiment = EnumValue<typeof FeedbackAISentiment>;
export type FeedbackActivityActorType = EnumValue<typeof FeedbackActivityActorType>;
export type FeedbackActivityType = EnumValue<typeof FeedbackActivityType>;
export type FeedbackChannel = EnumValue<typeof FeedbackChannel>;
export type FeedbackFieldStateField = EnumValue<typeof FeedbackFieldStateField>;
export type FeedbackFieldStateSource = EnumValue<typeof FeedbackFieldStateSource>;
export type FeedbackIngestionStatus = EnumValue<typeof FeedbackIngestionStatus>;
export type FeedbackPriority = EnumValue<typeof FeedbackPriority>;
export type FeedbackStatus = EnumValue<typeof FeedbackStatus>;
export type IntegrationConnectionStatus = EnumValue<typeof IntegrationConnectionStatus>;
export type IntegrationCredentialType = EnumValue<typeof IntegrationCredentialType>;
export type IntegrationDemoScenario = EnumValue<typeof IntegrationDemoScenario>;
export type IntegrationMode = EnumValue<typeof IntegrationMode>;
export type IntegrationOAuthAction = EnumValue<typeof IntegrationOAuthAction>;
export type IntegrationProvider = EnumValue<typeof IntegrationProvider>;
export type IntegrationWebhookDeliveryStatus = EnumValue<
  typeof IntegrationWebhookDeliveryStatus
>;
export type PlatformAppearance = EnumValue<typeof PlatformAppearance>;
export type PrismaClient = import("@prisma/client").PrismaClient;
export type StaffInvitationStatus = EnumValue<typeof StaffInvitationStatus>;
export type SynchronizationItemStatus = EnumValue<typeof SynchronizationItemStatus>;
export type SynchronizationRunStatus = EnumValue<typeof SynchronizationRunStatus>;
export type SynchronizationTriggerType = EnumValue<typeof SynchronizationTriggerType>;
export type UserRole = EnumValue<typeof UserRole>;
