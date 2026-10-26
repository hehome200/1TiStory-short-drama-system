# InkOS creative methodology on Claude Agent SDK

Portable AGPL-3.0-only **short-drama** workflow, not the InkOS full Pi runtime.
Only the embedding application's existing Claude Agent SDK may execute model calls.
This package has no second Harness, DB, queue, Provider, filesystem or billing.

Pass four verified CURRENT Writer inputs to `runInkOSWorkflow` and supply a
server-owned `invoke` adapter. Steps: plan → compose → write → observe → audit,
and **only on explicit revision intent** revise. Five model executions minimum,
six if revision is approved. The embedding application MUST use its own
authorization, provider receipts, deduplication, cumulative budget and UNKNOWN
recovery before enabling paid calls. Review and state deltas are *proposals*.
No body or state is applied.

Upstream Skills in `skills/` remain attributed and AGPL-3.0-only.
Source is prepared for independent publication; publication and license
compatibility are separate from technical ZERO-CALL qualification.

## 1TiStory integration
The host-side adapter is `src/lib/inkos-study/claude-sdk-workflow-adapter.ts`.
It calls the **existing** `executeClaudeAgentSdk` for each phase. This is
source-registered only; `INKOS_CLAUDE_SDK_WORKFLOW_ENABLED` defaults off and
paid dispatch needs per-stage existing Work Session/Provider admission.
