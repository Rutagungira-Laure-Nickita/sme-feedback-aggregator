# Phase 14 Automation Rules Engine Discovery

Date: 2026-07-27

Implementation follow-up, 2026-07-27: Phase 14 Automation Rules Engine has since been implemented with migration `20260727091241_phase_14_automation_rules`, owner/admin-only APIs, the automation worker, frontend rule builder, execution history, field-source tracking, system activity attribution, and focused automation policy tests. A later completion audit added follow-up migration `20260727143000_phase_14_field_source_backfill`, `FeedbackFieldStateSource.DEFAULT`, historical field-source backfill, expanded automation tests, and URL-backed automation list filters. The original discovery content below is retained as historical planning context. Manual browser/functional verification remains pending with the user.

This report is documentation-only discovery for Phase 14, Automation Rules Engine. No application code, Prisma schema, migration, package, reference image, browser session, browser automation, screenshot, or manual verification was added.

## 1. Current Implementation Findings

Phases 1 through 7 are complete and manually verified. Phases 8 through 10 are implemented and core manual workflows passed, but final multi-tenant, platform-administrator, concurrency, failure-handling, regression, and security verification remains deferred until after Phase 20. Phases 11, 12, and 13 are implementation-complete and manually unverified. Phase 13 is migrated with `20260727083000_phase_13_ai_feedback_analysis`; that migration must remain unchanged.

## 2. Existing Workflow Services

`backend/src/modules/feedback-workflow/feedback-workflow.service.ts` owns status, note, assignment, category, priority, eligible-assignee, and activity behavior. Human-facing methods resolve `BusinessMembership`, enforce active membership/business state, enforce branch access, validate targets, use transactional conditional updates for mutable fields, and write `FeedbackActivity` with `actorMembershipId`. Automation should reuse extracted domain validation and mutation helpers, but it should not call the public human methods with a fake membership actor.

## 3. Existing AI Integration Points

`FeedbackProcessingService` schedules AI after feedback persistence and after non-blocking customer auto-linking. AI scheduling, worker processing, retries, stale recovery, daily limits, and optional category auto-apply are implemented in `backend/src/modules/ai-analysis`. Phase 14 should hook after AI completion and after Phase 13 category auto-application so automation sees the final AI suggestion/application state.

## 4. Phase 14 Risks

Primary risks are tenant leakage, branch leakage, rule target enumeration, privilege escalation through system actions, automation overwriting human work, repeated reapplication, rule loops, stale target resources, execution history disclosure, noisy internal activity, and feedback ingestion becoming blocked by automation failures.

## 5. Recommended Phase 14 MVP

Owner/admin-managed, business-scoped rules with triggers `FEEDBACK_CREATED`, `AI_ANALYSIS_COMPLETED`, and `MANUAL_TEST`; flat `ALL` or `ANY` condition lists; max 10 conditions; max 5 actions; actions `SET_PRIORITY`, `SET_CATEGORY`, `ASSIGN_TO_MEMBERSHIP`, `UNASSIGN`, and `SET_STATUS`; deterministic ordering; optional stop processing; queue-backed execution; idempotency fingerprint; execution audit history; human override protection; no notifications, customer messages, arbitrary code, scheduled scans, or bulk historical backfill.

## 6. Rule Triggers

Approve `FEEDBACK_CREATED`, `AI_ANALYSIS_COMPLETED`, and `MANUAL_TEST` for MVP. Defer workflow-change triggers, customer-linked triggers, scheduled evaluation, rating-changed triggers, and broad recurring rules because they materially increase loop risk.

## 7. Condition Types

MVP conditions: branch equals or in list, channel equals, rating min/max/missing, status equals, priority equals, category equals/no category, assigned/unassigned/assigned-to-membership, linked/unlinked customer, AI status completed/failed/skipped, sentiment equals, sentiment confidence minimum, suggested category equals/available, category confidence minimum. Defer text contains, arbitrary date/time expressions, regex, SQL, JavaScript, nested formulas, and customer identity heuristics.

## 8. Condition Operators

Use typed operators: `EQUALS`, `IN`, `MIN`, `MAX`, `IS_EMPTY`, `IS_NOT_EMPTY`, and `AT_LEAST`. Avoid user-authored operators. Confidence values must be numeric 0 to 1 and rating values 1 to 5.

## 9. Match Mode

Use one top-level match mode: `ALL` or `ANY`. Conditions are flat, ordered only for display, and capped at 10. Nested groups are out of scope.

## 10. Action Types

MVP actions: `SET_PRIORITY`, `SET_CATEGORY`, `ASSIGN_TO_MEMBERSHIP`, `UNASSIGN`, and `SET_STATUS`. Defer `ADD_INTERNAL_NOTE` unless a later approval accepts timeline noise. Exclude notifications, email, WhatsApp, webhooks, customer replies, tasks, and arbitrary code.

## 11. Action Order

Use deterministic action order: category, priority, assignment, status. Store explicit action positions for UI display, but execution should normalize to deterministic type order to reduce surprising conflicts.

## 12. Multiple Rule Behavior

Recommend evaluating enabled rules by ascending `position`; all matching rules may run unless a matching rule has `stopProcessing=true`. Later automation may overwrite previous automation within the same event, but human-protected fields must not be overwritten.

## 13. Stop-Processing Behavior

Support optional `stopProcessing` in MVP. It stops later rule evaluation only when the rule matches, even if an action is skipped due to human override. This is understandable and prevents rule fights.

## 14. Human Override Policy

Human values are authoritative. Automation may set default/empty fields, may overwrite prior automation-owned values where the action's overwrite policy allows it, and may not overwrite fields marked human-owned. Status changes need transition validation and should not force invalid jumps.

## 15. Field-Source Tracking

Current schema does not distinguish human, AI, and automation ownership for priority, status, assignment, or category. Add minimal source tracking in Phase 14: per-field source rows or compact fields tied to feedback, with values such as `HUMAN`, `AI`, `AUTOMATION`, and nullable `sourceRuleId`. Prefer not adding many columns directly to `Feedback`.

## 16. System Actor Design

Do not use a real `BusinessMembership` as the actor. Add explicit activity source/actor type support so feedback activity can display "Automation rule \"Urgent negative feedback\" changed priority from NORMAL to URGENT." Use nullable membership plus system metadata or a dedicated activity source enum.

## 17. Rule Lifecycle

Use lifecycle status plus validation status: `DRAFT`, `ACTIVE`, `PAUSED`, `INVALID`, and `ARCHIVED`. New rules start as `DRAFT` or paused until explicitly enabled. Enabling must run full server validation.

## 18. Rule Versioning

Use an integer `version` on `AutomationRule`, increment on definition changes, and store `ruleVersion` plus a compact rule snapshot on executions. Do not add immutable version tables in MVP unless required later.

## 19. Database Design

Recommend relational rows for rules, conditions, actions, executions, and action executions. Relational targets give Prisma-enforced foreign keys for branch/category/membership references and easier validation. Store small `valueJson` only for type-specific option payloads.

## 20. Enum Design

Recommended enums: `AutomationRuleTrigger`, `AutomationRuleMatchMode`, `AutomationRuleStatus`, `AutomationValidationStatus`, `AutomationConditionType`, `AutomationConditionOperator`, `AutomationActionType`, `AutomationExecutionStatus`, `AutomationActionExecutionStatus`, `AutomationFieldSource`, and `AutomationTriggerSource`.

## 21. Execution Model

Create queued execution/event records after trigger events. A worker claims queued rows, evaluates rules against a fresh feedback snapshot, writes execution/action results, and applies successful actions transactionally per feedback and rule.

## 22. Worker Design

Use a database-backed worker similar to the AI worker: poll interval, batch size, claim token, `lockedAt`, stale recovery, bounded retries, safe logs, and graceful start/stop. Automation failure must not roll back valid feedback or AI analysis persistence.

## 23. Trigger Integration

For `FEEDBACK_CREATED`, enqueue after feedback persistence, customer auto-linking, and AI scheduling, outside the ingestion transaction. For `AI_ANALYSIS_COMPLETED`, enqueue after AI analysis persistence and after Phase 13 auto-category behavior. `MANUAL_TEST` is dry-run only and does not enqueue mutating work.

## 24. Idempotency

Use a deterministic input fingerprint based on rule ID, rule version, trigger, feedback ID, relevant feedback fields, AI analysis fields, and event-chain ID. Add a unique key preventing the same rule/version/input fingerprint from mutating the same feedback repeatedly.

## 25. Loop Prevention

No workflow-change triggers in MVP. Add event-chain ID and max depth even in MVP so future triggers cannot recurse indefinitely. Rule actions should not trigger another MVP automation event.

## 26. Concurrency

Use conditional updates matching current field values and source-protection state. Record conflict/skip results when a field changed between evaluation and action. Status uses current transition allowlist.

## 27. Retry Policy

Retry only transient worker claim/execution failures. Do not retry validation failures, stale targets, inaccessible resources, human override skips, invalid transitions, or already-executed fingerprints. Suggested max retries: 3.

## 28. Rule Test/Preview

Add dry-run endpoint to evaluate one rule against one accessible feedback and return matched/not matched plus per-condition and per-action preview. It must not write feedback, activities, executions, or source tracking.

## 29. Manual Execution

Allow owner/admin manual execution against one selected feedback after MVP validation. It should enqueue or run one bounded execution, respect the same idempotency and human override rules, and create audit history.

## 30. Historical Processing Decision

No uncontrolled historical backfill in MVP. Defer bulk historical processing. If later added, limit batch size, preview count first, and run through the same queue.

## 31. Role Permissions

Owner/admin only for create, edit, enable, disable, archive, duplicate, test, and manual run. Managers may optionally receive read-only rule/execution visibility only for their accessible branches after user approval. Staff should not see automation management.

## 32. Branch Scoping

Rules belong to a business. Rule conditions/actions may reference branches in that business. Branch-limited users must not see hidden branch conditions, target counts, or execution details. Execution must operate only on the feedback's business and branch.

## 33. Target Membership Validation

Assignment targets must be active business memberships and eligible for the feedback branch at execution time. Removed/suspended/ineligible targets make the action skipped or failed with a safe target error, not cross-tenant leakage.

## 34. Category Target Validation

Category targets must belong to the business and be active at execution time. Inactive or deleted categories invalidate/skip the action and should mark the rule validation state stale or invalid.

## 35. Status Action Validation

Status action must be a valid transition from the current status at execution time. Invalid transitions are action failures, not forced updates. Same-status actions should be skipped as no-op.

## 36. Priority Action Validation

Priority action accepts `LOW`, `NORMAL`, `HIGH`, or `URGENT`. Same-priority action should be skipped as no-op. Human-owned priority must not be overwritten.

## 37. Assignment Action Validation

`ASSIGN_TO_MEMBERSHIP` requires target eligibility. `UNASSIGN` may clear only automation-owned or unprotected assignments unless explicitly configured otherwise. Staff self-assignment rules do not apply because automation is not a staff actor.

## 38. API Design

Recommended MVP endpoints: list/create/get/patch rules, enable, disable, archive, duplicate, test, manual run for one feedback, list rule executions, and get execution detail. All under `/api/businesses/:businessId/automation-rules` or `/api/businesses/:businessId/automation-executions`. Use Zod schemas, pagination, safe errors, and owner/admin enforcement.

## 39. Frontend Routes

Recommended routes: `/business/:businessId/automations`, `/business/:businessId/automations/new`, `/business/:businessId/automations/:ruleId`, `/business/:businessId/automations/:ruleId/edit`, and `/business/:businessId/automations/:ruleId/executions`.

## 40. Rule List Design

Rule list should show status, trigger, condition summary, action summary, position, last execution, execution count, validation warnings, enable/disable/archive controls, and empty/loading/error states.

## 41. Rule Builder Design

Use a "When / If / Then / Review" structure. Use typed selects, toggles, segmented controls, menus, and validation rows. Avoid free-form code. Provide keyboard reordering or numeric order controls.

## 42. Execution History Design

Show paginated executions with trigger, matched, status, duration, actions attempted/succeeded/failed/skipped, safe error codes, rule version, feedback link, and per-action details. Respect branch access for any future manager visibility.

## 43. Feedback Drawer Integration

Add automation activity rows and possibly an automation history panel later. Activity must name the rule and source as automation. Do not add editable automation controls inside the drawer for MVP.

## 44. Inbox Integration Decision

Do not add inbox filters in MVP unless execution history proves useful. A simple automation badge or latest automation activity in detail is enough. Defer automation-specific inbox filters.

## 45. Error Handling

Use safe codes such as `AUTOMATION_RULE_NOT_FOUND`, `AUTOMATION_RULE_INVALID`, `AUTOMATION_ACCESS_DENIED`, `AUTOMATION_TARGET_INACTIVE`, `AUTOMATION_TARGET_INACCESSIBLE`, `AUTOMATION_STATUS_CONFLICT`, `AUTOMATION_HUMAN_OVERRIDE`, `AUTOMATION_ALREADY_EXECUTED`, `AUTOMATION_LOOP_PREVENTED`, `AUTOMATION_EXECUTION_FAILED`, `AUTOMATION_EXECUTION_PARTIAL`, and `AUTOMATION_STALE_RULE`.

## 46. Security

All rule definitions are server validated. Never expose hidden branches, hidden memberships, cross-business rules, stack traces, SQL, raw JSON definitions, or sensitive metadata. Store rule names/descriptions as plain text and render escaped. Rate-limit management/test endpoints.

## 47. Limits

Recommended limits: 50 active rules per business, 200 total non-archived rules, 10 conditions/rule, 5 actions/rule, 100 executions per worker batch maximum with MVP default 10, 25 manual evaluations per request maximum but MVP one feedback only, 120-character rule names, 500-character descriptions, no text-contains MVP, max 3 retries, max event-chain depth 3.

## 48. Performance

Load active rules by business and trigger, prefilter by trigger, evaluate in application memory, fetch target lookups in batches, and index queue/history tables by business/status/trigger/feedback/rule/createdAt. Avoid external rules engines.

## 49. Responsive and Dark-Mode Design

Use dense workspace UI, not a marketing page. Desktop can show list plus detail/builder panes. Mobile should use stacked sections and accessible sheets, not drag-only ordering. Inputs must use existing dark-mode tokens and avoid horizontal overflow.

## 50. Accessibility

Every rule-builder row needs labels, descriptive remove buttons, non-color status text, focus management in dialogs, validation messages tied to controls, keyboard ordering alternatives, live region updates for test results, and screen-reader-readable rule summary.

## 51. Automated Test Strategy

Add backend pure tests for validation, condition evaluation, match modes, action planning, human override policy, fingerprinting, loop prevention, and retry classification. Add service tests for branch scoping, target validation, status transitions, action order, partial failures, and execution history security when a test database strategy is available.

## 52. Combined Phase 11+12+13+14 Manual Test Prerequisites

Prepare owner, admin, branch-limited manager, Staff A, and Staff B accounts; Remera/Gisimenti and Gasanze branches; active/email-only/phone-only/archived/no-feedback/cross-branch/conflicting customers; at least 25 feedback records across manual, public form, QR, statuses, priorities, categories, assignments, customer links, AI statuses, sentiments, confidence levels, suggestions, auto-applied category, and human override cases; and automation rules covering branch, rating, non-AI, AI sentiment/confidence, assignment, category, priority, status, ALL, ANY, disabled, invalid-target, archived, and stop-processing behavior if approved.

## 53. Migration Requirement and Proposed Shape

Phase 14 requires a migration during implementation. Proposed models: `AutomationRule`, `AutomationCondition`, `AutomationAction`, `AutomationExecution`, `AutomationActionExecution`, and field-source tracking. Add indexes for business/status/trigger/position, queue status/lockedAt, feedback/rule execution lookup, and unique idempotency fingerprint. No migration was created in this discovery task.

## 54. Explicit Out-of-Scope Items

Customer emails, WhatsApp/SMS, push notifications, webhooks, external APIs, connector synchronization, scheduled recurring rules, arbitrary JavaScript/SQL/regex, nested groups, AI-generated rules, natural-language rule creation, customer replies, marketplace templates, cross-business rules, reports/analytics overhaul, Phase 15 notifications, Phase 20 connectors, monitoring, unlimited historical execution, and hard deleting executed rules.

## 55. Open Decisions Requiring User Approval

Approve owner/admin-only management; MVP trigger/action/condition list; all matching rules with optional stop-processing versus first-match-only; partial execution versus all-or-nothing; exact human override model; whether manager read-only visibility is allowed; whether `ADD_INTERNAL_NOTE` is excluded; whether manual execution against one existing feedback is included; whether rule duplication is included; and exact active/total rule limits.

## 56. Reference Design Plan

After scope approval, create exactly two Phase 14 reference images: `frontend/references/phase14-automation-rules-primary.png` and `frontend/references/phase14-automation-rules-states.png`. No Phase 14 references were created during discovery.

## 57. Documentation Files Updated

Updated memory and planning documentation to record Phase 14 discovery, recommended MVP, no implementation start, pending manual verification for Phases 11 through 14, and Phase 15/20 not started.

## 58. Static Check Results

`npm run format` passed and made no formatting changes. `npm run format:check` passed. `git diff --check` passed with only Git line-ending notices about LF being replaced by CRLF the next time Git touches the modified Markdown files.

## 59. Exact Files Changed

Documentation-only files changed: `PHASE_14_DISCOVERY_REPORT.md`, `AGENTS.md`, `IMPLEMENTATION_STATUS.md`, `NEXT_STEPS.md`, `ARCHITECTURE.md`, `API_NOTES.md`, `DATABASE_NOTES.md`, `SECURITY_NOTES.md`, `DEPLOYMENT.md`, `CHANGELOG.md`, and `README.md`.

## 60. Confirmations

No application code changed. Prisma schema unchanged. No migration created. No package added. No Phase 14 implementation started. No Phase 14 references created. No browser opened. No browser automation used. No screenshots taken. No manual verification claimed. Phase 11 manual verification pending. Phase 12 manual verification pending. Phase 13 manual verification pending. Phases 11 through 14 will be tested together after Phase 14 implementation. Phases 8 through 10 final deferred verification pending. Phase 15 not started. Phase 20 not started.
