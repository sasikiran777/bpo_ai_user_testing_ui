# Dev Testing Guide (English Test MVP)

This document explains where to change mock behavior for:
- Start button availability / single-attempt lock
- Instructions page content
- Section timers (5m / 5m / 3m)
- Grading “in progress” vs final results
- Result scoring and what is displayed

## Key Pages (Routes)

- Login: `/login`
- Dashboard: `/dashboard`
- Test flow: `/test/english`
- Results: `/results/english`

Routing is defined in [router/index.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/router/index.ts).

## Where “Start” / “View results” Comes From

Dashboard reads the session status:
- `not_started` or `in_progress` → show **Start/Continue**
- `grading` / `completed` / `failed` → show **View results**

File: [DashboardView.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/views/test/DashboardView.vue)

The session comes from:
- `testApi.getOrCreateSession('english')`

File: [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)

### Forcing “Start” to show again (DEV only)

The mock is stored in `localStorage`.

Clear all keys that start with `bpo_test_`:
- `bpo_test_session:*`
- `bpo_test_results:*`
- `bpo_test_grading_ready_at:*`

You can do this from DevTools Console:

```js
Object.keys(localStorage)
  .filter((k) => k.startsWith('bpo_test_'))
  .forEach((k) => localStorage.removeItem(k))
```

## Instructions Page

Instructions text is returned by:
- `testApi.getInstructions(testType)`

Edit the title/bullets here:
- [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)
  - function: `getInstructions`

The UI component that renders it:
- [InstructionsStep.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/components/modules/test/InstructionsStep.vue)

## Timers (5 min / 5 min / 3 min)

Durations are currently hardcoded in the flow composable:
- Writing: `useSectionTimer(300, ...)`
- Reading: `useSectionTimer(300, ...)`
- Speaking: `useSectionTimer(180)`

File: [useEnglishTestFlow.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/composables/test/useEnglishTestFlow.ts)

### For faster dev testing

You can temporarily reduce:
- writing 300 → 15
- reading 300 → 15
- speaking 180 → 10

Then restore to real values later.

## Reading & Speaking Prompts (Mock Data)

Reading passage + questions:
- `defaultReadingSet` in [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)

Speaking topic:
- `defaultSpeakingTopic` in [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)

## Grading “In Progress” vs Completed

### What triggers grading

Grading starts after speaking submission when we call:
- `testApi.submitTest(testType)`

This sets:
- session status → `grading`
- a `localStorage` key `bpo_test_grading_ready_at:*` to a timestamp in the future

File: [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)
  - function: `submitTest`

### How long grading takes (mock)

In `submitTest`:
- `const readyAt = now() + 15000`

Change `15000` (ms) to:
- `2000` for quick testing
- or longer to simulate real grading

### Results polling

Results page polls every 3 seconds until grading is done:
- [ResultsView.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/views/test/ResultsView.vue)
  - `startPolling()` uses `setInterval(..., 3000)`

Change polling interval if needed.

### What completes grading

When `now() >= readyAt`, `getResults()` upgrades the session to `completed`.

File: [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)
  - function: `getResults`

## Results Content + Scoring

All scoring is computed inside:
- `computeResults(testType, session)`

File: [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)

### Current scoring rules (mock)

- Writing score: based on number of words in `aboutMe`
- Reading score: correct answers count (case-insensitive; “short” allows includes-match)
- Speaking score: fixed `8/10` if speaking meta exists

Update those rules to match backend scoring later.

### UI that displays results

File: [ResultsView.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/views/test/ResultsView.vue)

If you want to add/remove sections shown, change this view only (API can stay).

## Manual Submit Confirmation Text

The manual submit confirmations are handled in:
- [TestFlowView.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/views/test/TestFlowView.vue)
  - `onSubmitWriting()`
  - `onSubmitReading()`
- Speaking early submit confirmation:
  - [SpeakingStep.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/components/modules/test/SpeakingStep.vue)

## Leaving / Refresh / Close Behavior (Fail Attempt)

When the user is in an active section and tries to leave:
- Browser shows native warning (beforeunload)
- SPA navigation shows confirm popup
- If they leave: attempt is marked `failed`

Files:
- [useAttemptLeaveGuard.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/composables/test/useAttemptLeaveGuard.ts)
- [TestFlowView.vue](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/views/test/TestFlowView.vue)
- `testApi.markAttemptFailedSync` (best-effort on unload): [test.api.ts](file:///Users/sasikiran/Web%20Projects/BPO%20Admin/AI%20User%20Testing/ui/src/apis/test/test.api.ts)

## Common DEV Scenarios

### 1) Simulate “already took test”

Set session status manually (DevTools Console):

```js
const key = Object.keys(localStorage).find(k => k.startsWith('bpo_test_session:'))
const s = JSON.parse(localStorage.getItem(key))
s.status = 'completed'
localStorage.setItem(key, JSON.stringify(s))
```

Reload `/dashboard` → should show “View results”.

### 2) Force grading to complete immediately

Set `bpo_test_grading_ready_at:*` to the past:

```js
const k = Object.keys(localStorage).find(k => k.startsWith('bpo_test_grading_ready_at:'))
localStorage.setItem(k, String(Date.now() - 1000))
```

Reload `/results/english`.

