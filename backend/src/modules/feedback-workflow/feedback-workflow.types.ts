import type {
  FeedbackStatus,
  FeedbackActivityType,
  FeedbackPriority,
  BusinessMemberRole
} from "@prisma/client";

export type StatusTransition = {
  fromStatus: FeedbackStatus;
  toStatus: FeedbackStatus;
};

export type StatusUpdateRequest = {
  status: FeedbackStatus;
};

export type NoteRequest = {
  note: string;
};

export type AssignmentRequest = {
  membershipId: string | null;
};

export type CategoryUpdateRequest = {
  categoryId: string | null;
};

export type PriorityUpdateRequest = {
  priority: FeedbackPriority;
};

export type ActorInfo = {
  membershipId: string;
  name: string;
  role: BusinessMemberRole;
};

export type StatusUpdateResponse = {
  feedback: {
    id: string;
    status: FeedbackStatus;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export type AssignmentResponse = {
  feedback: {
    id: string;
    assignedTo: {
      membershipId: string;
      name: string;
      role: string;
      isAvailable: boolean;
    } | null;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export type CategoryUpdateResponse = {
  feedback: {
    id: string;
    categoryId: string | null;
    category: {
      id: string;
      name: string;
      colorKey: string;
      isActive: boolean;
    } | null;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export type PriorityUpdateResponse = {
  feedback: {
    id: string;
    priority: FeedbackPriority;
    updatedAt: string;
  };
  activity: ActivityItem;
};

export type ActivityItem = {
  id: string;
  type: FeedbackActivityType | "FEEDBACK_RECEIVED";
  fromStatus: FeedbackStatus | null;
  toStatus: FeedbackStatus | null;
  fromValue: string | null;
  toValue: string | null;
  note: string | null;
  channel?: string;
  sourceLabel?: string;
  actor: ActorInfo | null;
  actorType?: "HUMAN" | "SYSTEM";
  automationRuleName?: string | null;
  createdAt: string;
  isSynthetic: boolean;
};

export type ActivityListResponse = {
  items: ActivityItem[];
};

export type EligibleAssignee = {
  membershipId: string;
  name: string;
  role: BusinessMemberRole;
  isAvailable: boolean;
};

export const ALLOWED_TRANSITIONS: StatusTransition[] = [
  { fromStatus: "NEW", toStatus: "IN_REVIEW" },
  { fromStatus: "NEW", toStatus: "RESOLVED" },
  { fromStatus: "IN_REVIEW", toStatus: "NEW" },
  { fromStatus: "IN_REVIEW", toStatus: "RESOLVED" },
  { fromStatus: "RESOLVED", toStatus: "IN_REVIEW" },
  { fromStatus: "RESOLVED", toStatus: "CLOSED" },
  { fromStatus: "CLOSED", toStatus: "IN_REVIEW" }
];

export function getAvailableTransitions(currentStatus: FeedbackStatus): FeedbackStatus[] {
  return ALLOWED_TRANSITIONS.filter((t) => t.fromStatus === currentStatus).map(
    (t) => t.toStatus
  );
}

export function isValidTransition(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return ALLOWED_TRANSITIONS.some((t) => t.fromStatus === from && t.toStatus === to);
}

export function isSameStatus(from: FeedbackStatus, to: FeedbackStatus): boolean {
  return from === to;
}

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  NEW: "New",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed"
};

export const PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent"
};

export const PRIORITY_ORDER: Record<FeedbackPriority, number> = {
  LOW: 3,
  NORMAL: 2,
  HIGH: 1,
  URGENT: 0
};
