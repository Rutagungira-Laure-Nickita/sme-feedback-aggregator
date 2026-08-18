export const AUTOMATION_ERRORS = {
  RULE_NOT_FOUND: "AUTOMATION_RULE_NOT_FOUND",
  RULE_INVALID: "AUTOMATION_RULE_INVALID",
  RULE_DISABLED: "AUTOMATION_RULE_DISABLED",
  RULE_ARCHIVED: "AUTOMATION_RULE_ARCHIVED",
  ACCESS_DENIED: "AUTOMATION_ACCESS_DENIED",
  CONDITION_INVALID: "AUTOMATION_CONDITION_INVALID",
  ACTION_INVALID: "AUTOMATION_ACTION_INVALID",
  TARGET_INACTIVE: "AUTOMATION_TARGET_INACTIVE",
  TARGET_INACCESSIBLE: "AUTOMATION_TARGET_INACCESSIBLE",
  CATEGORY_INACTIVE: "AUTOMATION_CATEGORY_INACTIVE",
  STATUS_CONFLICT: "AUTOMATION_STATUS_CONFLICT",
  HUMAN_OVERRIDE: "AUTOMATION_HUMAN_OVERRIDE",
  ALREADY_EXECUTED: "AUTOMATION_ALREADY_EXECUTED",
  EXECUTION_FAILED: "AUTOMATION_EXECUTION_FAILED",
  EXECUTION_PARTIAL: "AUTOMATION_EXECUTION_PARTIAL",
  LOOP_PREVENTED: "AUTOMATION_LOOP_PREVENTED",
  STALE_RULE: "AUTOMATION_STALE_RULE",
  LIMIT_REACHED: "AUTOMATION_LIMIT_REACHED",
  EVENT_ALREADY_EXISTS: "AUTOMATION_EVENT_ALREADY_EXISTS"
} as const;

export type AutomationErrorCode =
  (typeof AUTOMATION_ERRORS)[keyof typeof AUTOMATION_ERRORS];

export function safeAutomationErrorMessage(code: string): string {
  switch (code) {
    case AUTOMATION_ERRORS.RULE_NOT_FOUND:
      return "Automation rule was not found.";
    case AUTOMATION_ERRORS.ACCESS_DENIED:
      return "Automation access denied.";
    case AUTOMATION_ERRORS.HUMAN_OVERRIDE:
      return "A human-owned value was protected.";
    case AUTOMATION_ERRORS.ALREADY_EXECUTED:
      return "This automation already ran for the current feedback state.";
    case AUTOMATION_ERRORS.LOOP_PREVENTED:
      return "Automation loop prevention blocked this event.";
    case AUTOMATION_ERRORS.TARGET_INACTIVE:
    case AUTOMATION_ERRORS.CATEGORY_INACTIVE:
      return "An automation target is inactive.";
    case AUTOMATION_ERRORS.TARGET_INACCESSIBLE:
      return "An automation target is not eligible for this feedback.";
    case AUTOMATION_ERRORS.STATUS_CONFLICT:
      return "The requested status transition is not currently allowed.";
    case AUTOMATION_ERRORS.EVENT_ALREADY_EXISTS:
      return "This automation event already exists.";
    default:
      return "Automation could not complete safely.";
  }
}
