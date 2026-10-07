# Tiered Subscription, Admin Dashboard, and Verification Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build owner-level tier recommendations and manual subscription billing, an admin-only dashboard for billing/verification/reports, and mandatory three-photo property onboarding.

**Architecture:** Keep Convex as the source of truth. Add focused modules for subscriptions, admin reviews, verification, reports, and property photos; use shared authorization helpers and a pure tier calculator. The client uploads files to Convex Storage and submits storage IDs to authenticated mutations, while daily cron work materializes past-due state and reminder logs.

**Tech Stack:** Next.js 16.3.4, React 19, TypeScript, Tailwind CSS v4, Convex 1.46, Convex Auth, Vitest, convex-test, @edge-runtime/vm.

**Spec:** `docs/superpowers/specs/2026-10-07-tiered-subscription-admin-verification-design.md`

## Global Constraints

- Admin accounts are assigned manually by editing `owners.role` in the Convex Dashboard.
- Subscription payments are manual bank transfer/QRIS proof uploads; no payment gateway is added.
- A higher recommended tier never auto-upgrades, auto-charges, downgrades, or blocks features.
- Identity KTP/selfie and property ownership proof remain optional.
- Existing tenant payment flows remain separate from subscription billing.
- Do not use `any`; derive authentication from `ctx.auth.getUserIdentity()` and use `tokenIdentifier` for owner lookup.
- Use Convex validators for every public and internal function.
- Use separate child tables for property photos and do not store an unbounded photo array on `properties`.
- Every async UI handler must surface an error state; every new behavior gets a failing test before production code.

## Review Focus

- Owners with rooms across multiple properties must be counted once at account level; pin this in `convex/subscriptions.test.ts`.
- Owners at exact boundaries 5/6/20/21/40/41 must receive the correct tier; pin each boundary in `convex/subscriptions.test.ts`.
- A malformed or non-image storage ID must never be accepted as a property photo; pin this in `convex/owners.test.ts`.
- An owner must not call admin mutations even if they supply another owner’s document ID; pin this in `convex/admin.test.ts`.
- Past-due processing must be idempotent and must not change tier or disable owner features; pin this in `convex/crons.test.ts`.

### Task 1: Schema, roles, authorization, and pure tier rules

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/lib/auth.ts`
- Create: `convex/lib/subscription-tiers.ts`
- Create: `convex/subscriptions.test.ts`
- Create: `convex/authz.test.ts`

**Interfaces:**
- Produces `requireAdmin(ctx: QueryCtx | MutationCtx): Promise<Doc<"owners">>`.
- Produces `getTierForRoomCount(roomCount: number): "free" | "starter" | "growth" | "pro"`.
- Produces `getTierPrice(tier, billingCycle): number` with free/none equal to `0`.
- Adds schema tables/fields required by later tasks: `owners.role`, verification fields, `subscriptions`, `property_photos`, `reports`, and expanded notification types.

- [ ] **Step 1: Write failing tests**

  Add tests that assert all six room boundaries, price snapshots, `requireAdmin` success for `role: "admin"`, and rejection for `role: "owner"`.

  ```ts
  test("maps exact room boundaries to the expected tier", () => {
    expect(getTierForRoomCount(5)).toBe("free")
    expect(getTierForRoomCount(6)).toBe("starter")
    expect(getTierForRoomCount(20)).toBe("starter")
    expect(getTierForRoomCount(21)).toBe("growth")
    expect(getTierForRoomCount(40)).toBe("growth")
    expect(getTierForRoomCount(41)).toBe("pro")
  })
  ```

- [ ] **Step 2: Run tests and confirm the expected failure**

  Run `rtk vitest run convex/subscriptions.test.ts convex/authz.test.ts`; expect missing module/export or schema failures, not a passing test.

- [ ] **Step 3: Implement schema, pure helpers, and `requireAdmin`**

  Preserve all existing fields and indexes. Add indexes named with every indexed field, including `subscriptions.by_owner`, `subscriptions.by_status`, `property_photos.by_property`, and `reports.by_status`. `requireAdmin` must resolve the caller from `ctx.auth`, load the owner using `tokenIdentifier`, and throw `Akses admin ditolak.` unless role is `admin`.

- [ ] **Step 4: Run focused tests**

  Run `rtk vitest run convex/subscriptions.test.ts convex/authz.test.ts`; expect PASS.

- [ ] **Step 5: Commit**

  Run `rtk git add convex/schema.ts convex/lib/auth.ts convex/lib/subscription-tiers.ts convex/subscriptions.test.ts convex/authz.test.ts && rtk git commit -m "feat: add subscription schema and admin authorization"`.

### Task 2: Property photos and three-photo onboarding

**Files:**
- Modify: `convex/owners.ts`
- Modify: `convex/properties.ts`
- Modify: `app/onboarding/page.tsx`
- Modify: `components/botkos/image-upload-field.tsx`
- Create: `convex/propertyPhotos.ts`
- Create: `convex/owners.test.ts`
- Create: `components/botkos/multi-image-upload-field.tsx`

**Interfaces:**
- `propertyPhotos.generateUploadUrl(): Promise<string>` requires identity.
- `propertyPhotos.listForProperty({ propertyId })` returns photos with signed URLs for the property owner or public property lookup.
- `owners.completeOnboarding` accepts `propertyPhotoStorageIds: Id<"_storage">[]` and creates `property_photos`.

- [ ] **Step 1: Write failing Convex tests**

  Test that onboarding with two IDs throws `Minimal 3 foto kos wajib diunggah.`, that three image metadata IDs create three `property_photos`, and that a non-image storage document is rejected. Use `convexTest`, `t.run`, and `ctx.db.system.insert("_storage", ...)` fixtures where supported by the current test helpers.

- [ ] **Step 2: Run `rtk vitest run convex/owners.test.ts` and verify RED**

- [ ] **Step 3: Implement storage validation and transaction writes**

  Validate `propertyPhotoStorageIds.length >= 3`, load each storage record, require `contentType?.startsWith("image/")`, create the property, insert one photo document per ID with stable `sortOrder`, then update the owner. Add public property photo URLs without exposing raw storage IDs.

- [ ] **Step 4: Add the multi-file client component**

  Keep the existing single-file component behavior unchanged for payment forms. Build the new component with `File[]`, per-file preview, replacement/removal, image type validation, 5 MB default limit, and `required` validation based on `files.length < 3`. Revoke object URLs in an effect cleanup.

- [ ] **Step 5: Connect onboarding upload flow**

  In the first step, collect photos, upload each through `generateUploadUrl`, POST the file body, read the returned storage ID, and pass IDs to `completeOnboarding`. Disable submit while uploading and show mutation/upload errors. Do not require KTP/selfie/ownership proof.

- [ ] **Step 6: Run focused tests and typecheck**

  Run `rtk vitest run convex/owners.test.ts convex/schema.test.ts` and `rtk tsc`; expect PASS.

- [ ] **Step 7: Commit**

  Run `rtk git add convex/owners.ts convex/properties.ts convex/propertyPhotos.ts convex/owners.test.ts app/onboarding/page.tsx components/botkos/image-upload-field.tsx components/botkos/multi-image-upload-field.tsx && rtk git commit -m "feat: require three property photos during onboarding"`.

### Task 3: Room-count cache, subscription owner flow, and billing UI

**Files:**
- Modify: `convex/rooms.ts`
- Modify: `convex/owners.ts`
- Create: `convex/subscriptions.ts`
- Create: `convex/subscriptions.test.ts` additions
- Create: `app/dashboard/billing/page.tsx`
- Modify: `app/dashboard/page.tsx`
- Modify: `components/botkos/dashboard-nav.tsx`
- Create: `components/botkos/subscription-banner.tsx`
- Create: `components/botkos/subscription-form.tsx`

**Interfaces:**
- `subscriptions.getMine()` returns active subscription, room count, recommended tier, and upgrade-required boolean.
- `subscriptions.submitPayment({ tier, billingCycle, proofStorageId })` validates owner access and image proof, snapshots price, and writes `pending_payment`.
- `subscriptions.recalculateForOwner(ctx, ownerId)` updates room-count cache and returns `{ roomCount, activeTier, recommendedTier, shouldNotify }` without changing active tier.

- [ ] **Step 1: Write failing tests**

  Create owners with rooms split across two properties and assert account-level count. Assert `recalculateForOwner` leaves an active starter subscription unchanged when 21 rooms recommend growth. Test payment submission rejects non-image proof and stores the selected historical price.

- [ ] **Step 2: Run focused subscription tests and verify RED**

  Run `rtk vitest run convex/subscriptions.test.ts`; expect failures for missing functions.

- [ ] **Step 3: Implement centralized recalculation**

  Query all owner properties through `properties.by_owner`, query rooms per property, sum counts, derive recommendation, create/update a free subscription when absent, patch only `roomCountAtLastCheck`, and schedule an upgrade notification through the existing notification/delivery pattern when the recommendation is higher than the active tier.

- [ ] **Step 4: Hook recalculation into room mutations**

  Call the helper after successful onboarding room insertion, room creation, and room deletion. Preserve existing room ownership checks and deletion behavior.

- [ ] **Step 5: Implement owner subscription mutations and queries**

  Require owner identity, validate tier/cycle compatibility, validate image proof through `_storage`, and set `pending_payment`. Use configuration constants for current prices; persist the selected amount on the subscription.

- [ ] **Step 6: Build billing UI and dashboard banner**

  Add the billing route with tier/cycle selection, transfer instructions, proof upload, current status, and retry after rejection. Add a banner only when recommendation exceeds active tier. No feature gating is added.

- [ ] **Step 7: Run tests and typecheck**

  Run `rtk vitest run convex/subscriptions.test.ts` and `rtk tsc`; expect PASS.

- [ ] **Step 8: Commit**

  Run `rtk git add convex/rooms.ts convex/owners.ts convex/subscriptions.ts convex/subscriptions.test.ts app/dashboard/billing/page.tsx app/dashboard/page.tsx components/botkos/dashboard-nav.tsx components/botkos/subscription-banner.tsx components/botkos/subscription-form.tsx && rtk git commit -m "feat: add owner subscription billing flow"`.

### Task 4: Verification and reports backend

**Files:**
- Create: `convex/verifications.ts`
- Create: `convex/reports.ts`
- Create: `convex/verifications.test.ts`
- Create: `convex/reports.test.ts`
- Modify: `convex/properties.ts`
- Modify: `convex/owners.ts`

**Interfaces:**
- `verifications.listPendingIdentity()` and `verifications.listPendingProperties()` are admin-only.
- `verifications.reviewIdentity({ ownerId, decision, reason })` and `reviewProperty({ propertyId, decision, reason })` are admin-only and idempotently transition pending records.
- `reports.listOpen()` and `reports.updateStatus({ reportId, status })` are admin-only.

- [ ] **Step 1: Write failing tests**

  Assert admin can approve/reject pending identity/property records, owner cannot call either mutation, repeated review of a decided record fails, and report status transitions are limited to `reviewed` or `resolved` from `open`/`reviewed`.

- [ ] **Step 2: Run `rtk vitest run convex/verifications.test.ts convex/reports.test.ts` and verify RED**

- [ ] **Step 3: Implement owner submission helpers**

  Add authenticated mutations for optional KTP/selfie and ownership proof submissions. Validate storage content types and set `pending_review`; do not change onboarding completion or feature access.

- [ ] **Step 4: Implement admin review queries/mutations**

  Use `requireAdmin`, bounded `.take()` queries, signed URLs for proof/photos, decision validation, reviewer metadata, and clear rejection reasons. Never authorize based on a client-supplied owner ID.

- [ ] **Step 5: Implement reports**

  Add a bounded admin list and status mutation with explicit allowed transitions and reviewer timestamps.

- [ ] **Step 6: Run focused tests and typecheck**

  Run `rtk vitest run convex/verifications.test.ts convex/reports.test.ts` and `rtk tsc`.

- [ ] **Step 7: Commit**

  Run `rtk git add convex/verifications.ts convex/reports.ts convex/verifications.test.ts convex/reports.test.ts convex/properties.ts convex/owners.ts && rtk git commit -m "feat: add verification and report review backend"`.

### Task 5: Admin billing backend and daily past-due processing

**Files:**
- Modify: `convex/subscriptions.ts`
- Modify: `convex/crons.ts`
- Modify: `convex/notifications.ts`
- Create: `convex/admin.ts`
- Create: `convex/admin.test.ts`
- Create: `convex/crons.test.ts`

**Interfaces:**
- `admin.getBillingOverview()` returns pending proofs, past-due owners, tier counts, and estimated monthly revenue.
- `admin.approveSubscription({ subscriptionId })` and `admin.rejectSubscription({ subscriptionId, reason })` are admin-only.
- `admin.getVerificationOverview()` and `admin.getReportsOverview()` compose the review lists for the UI.
- `crons.processSubscriptionPeriods` is an internal mutation scheduled daily.

- [ ] **Step 1: Write failing tests**

  Test approve sets `active`, reviewer, and monthly/annual period end; reject stores reason; owner calls are rejected; daily processing changes expired active records to `past_due`, creates one reminder, and is idempotent on a second run.

- [ ] **Step 2: Run focused tests and verify RED**

  Run `rtk vitest run convex/admin.test.ts convex/crons.test.ts`.

- [ ] **Step 3: Implement admin billing queries/mutations**

  Return bounded records with owner identity and signed proof URL. Estimate monthly revenue as monthly active price plus annual active price divided by 12. Validate pending state before approve/reject; calculate period end from approval time and cycle.

- [ ] **Step 4: Implement the daily cron**

  Add `processSubscriptionPeriods` as an internal mutation and register it with `crons.interval("daily subscription periods", { hours: 24 }, internal.crons.processSubscriptionPeriods, {})`. Only process expired active subscriptions, patch to past_due, and log/schedule the existing bot reminder once per owner/period.

- [ ] **Step 5: Run tests and typecheck**

  Run `rtk vitest run convex/admin.test.ts convex/crons.test.ts` and `rtk tsc`.

- [ ] **Step 6: Commit**

  Run `rtk git add convex/subscriptions.ts convex/crons.ts convex/notifications.ts convex/admin.ts convex/admin.test.ts convex/crons.test.ts && rtk git commit -m "feat: add admin billing review and past-due cron"`.

### Task 6: Protected admin dashboard UI

**Files:**
- Create: `components/botkos/admin-gate.tsx`
- Create: `components/botkos/admin-dashboard.tsx`
- Create: `app/admin/layout.tsx`
- Create: `app/admin/page.tsx`
- Create: `app/admin/billing/page.tsx`
- Create: `app/admin/verification/page.tsx`
- Create: `app/admin/reports/page.tsx`

**Interfaces:**
- `AdminGate` renders children only when `api.owners.me` returns `role: "admin"`; non-admin users are redirected to `/dashboard`.
- Pages use the admin API from Task 5 and display loading, empty, success, and error states.

- [ ] **Step 1: Write UI tests or component-level behavior tests for the gate and decision controls**

  Pin that non-admin users never see approve/reject controls and that reject requires a non-empty reason. Use the project’s existing test setup; if no React DOM test runner exists, keep the server behavior covered by Task 5 and verify the controls manually during the final build check.

- [ ] **Step 2: Implement `AdminGate`**

  Use Convex Auth loading state, query current owner, redirect unauthenticated users to `/login`, redirect authenticated non-admin users to `/dashboard`, and show a neutral loading state while resolving.

- [ ] **Step 3: Implement admin layout and tabs**

  Add navigation for Billing, Verifikasi, and Laporan with the existing visual language. Do not reuse `OwnerGate` because it assumes onboarding and owner-only navigation.

- [ ] **Step 4: Implement billing page**

  Render summary cards, pending proof rows with signed image preview, approve button, reject dialog/reason, and past-due list. Refresh through Convex reactivity after mutations.

- [ ] **Step 5: Implement verification and reports pages**

  Render KTP/selfie side-by-side, property proof and property photos, decision actions, and report status controls. Show verification state as informational only.

- [ ] **Step 6: Run typecheck and build**

  Run `rtk tsc` and `rtk next build`; expect both PASS.

- [ ] **Step 7: Commit**

  Run `rtk git add components/botkos/admin-gate.tsx components/botkos/admin-dashboard.tsx app/admin && rtk git commit -m "feat: add protected admin dashboard"`.

### Task 7: Public property photos, verification badge, and final integration

**Files:**
- Modify: `convex/properties.ts`
- Modify: `app/[propertySlug]/daftar/page.tsx`
- Modify: `app/[propertySlug]/page.tsx` if present/needed by current route structure
- Modify: `README.md`
- Create or modify: report creation UI only if an existing report entry point is present

- [ ] **Step 1: Write a regression test for public property output**

  Assert the public property query returns signed property-photo URLs and `isVerified: true` only for approved properties; pending properties remain public without the badge.

- [ ] **Step 2: Run the regression test and verify RED**

  Run `rtk vitest run convex/properties.test.ts`; expect the new fields to be absent before implementation.

- [ ] **Step 3: Implement public projection and UI**

  Add bounded property-photo reads and render the gallery/badge without changing room availability or registration rules.

- [ ] **Step 4: Document manual setup**

  Update README with manual admin assignment (`owners.role = "admin"`), billing transfer instruction configuration location, and the fact that no gateway or auto-downgrade exists.

- [ ] **Step 5: Run full verification**

  Run `rtk vitest run`, `rtk tsc`, `rtk lint`, and `rtk next build`. Fix only failures caused by this feature and report unrelated pre-existing failures explicitly.

- [ ] **Step 6: Commit**

  Run `rtk git add convex/properties.ts app README.md && rtk git commit -m "feat: publish property photos and verification badge"`.

## Final review

- [ ] Review `rtk git diff` for accidental edits to existing tenant payment behavior.
- [ ] Confirm no new dependency was installed.
- [ ] Confirm no admin route is reachable through owner authorization.
- [ ] Confirm every new async UI action has visible error handling.
- [ ] Confirm full tests/typecheck/lint/build results are recorded before claiming completion.
