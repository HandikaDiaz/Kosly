# Tiered Subscription, Admin Dashboard, and Verification Onboarding

## Purpose

Add a manual, owner-level subscription model; a protected admin dashboard; and trust/verification review flows without blocking normal owner usage. The only onboarding requirement is at least three property photos, which are used both for public presentation and future admin review.

## Scope and constraints

- Convex remains the source of truth for data, authorization, storage metadata, and scheduled work.
- Admin accounts are assigned manually by editing `owners.role` in the Convex Dashboard.
- Subscription payments are manual bank transfer/QRIS proof uploads; no payment gateway is added.
- A higher recommended tier never auto-upgrades, auto-charges, downgrades, or blocks features.
- Identity KTP/selfie and property ownership proof remain optional.
- Existing tenant payment flows remain separate from subscription billing.

## Data model

`owners` gains `role: owner | admin`, defaulting to `owner`, plus optional identity verification state and storage references for KTP/selfie.

`subscriptions` contains one owner subscription with:

- `ownerId` and a unique owner index
- `tier: free | starter | growth | pro`
- `billingCycle: monthly | annual | none`
- `priceAmount` as a historical transaction snapshot
- `status: active | pending_payment | past_due | canceled`
- optional `currentPeriodEnd`, transfer proof storage ID, reviewer metadata, and rejection reason
- `roomCountAtLastCheck`

`property_photos` stores one photo per document (`propertyId`, storage ID, sort order, optional caption, creation time). This avoids an unbounded array on a property document.

`properties` gains property verification state and optional ownership-proof storage reference.

`reports` stores an optional reporter owner/tenant reference, an optional property reference, description, and `status: open | reviewed | resolved`, with admin review metadata.

Notification types gain upgrade and subscription past-due reminders. Existing notification types and tenant payment records are unchanged.

## Tier rules

| Tier | Total rooms across owner properties | Monthly | Annual | Property limit |
| --- | ---: | ---: | ---: | --- |
| free | 1–5 | Rp0 | — | 1 |
| starter | 6–20 | Rp59.000 | Rp590.000 | 1 |
| growth | 21–40 | Rp109.000 | Rp1.090.000 | 3 |
| pro | 41+ | Rp199.000 | Rp1.990.000 | unlimited |

The free baseline is used for new owners and owners with no paid subscription. A shared helper calculates total rooms and the recommended tier. It is invoked by onboarding, room creation, and room deletion. It updates the cached room count and emits an upgrade notification only when the recommendation exceeds the active tier; it never changes the active tier.

## Authorization

Authentication always derives identity from `ctx.auth.getUserIdentity()` and resolves the owner by `tokenIdentifier`.

- `requireOwner` protects owner features.
- `requireAdmin` additionally requires `owners.role === "admin"` and protects every admin query/mutation.
- Admin functions never accept an owner ID as an authorization substitute.
- Signed storage URLs are generated only after the caller has passed the appropriate owner/admin authorization check.

## Onboarding and media flow

The first onboarding step adds a multi-file property-photo field. The client validates image type and size, previews each file, and supports removal/replacement. It uploads files to Convex Storage, then calls onboarding with at least three storage IDs.

The onboarding mutation validates all storage IDs as images, creates the property, creates `property_photos`, and completes the owner profile in one transaction. Missing or invalid photos reject the mutation. KTP, selfie, and ownership proof are not required. Uploaded files that are abandoned before submission may remain orphaned and are outside this phase's cleanup scope.

Public property queries return signed property-photo URLs and a verification badge only when the property status is approved. Verification status never gates room registration, payments, or owner dashboard access.

## Subscription flow

The owner billing UI displays the active subscription, room count, recommended tier, and upgrade banner. The owner chooses a tier/cycle, sees configured transfer instructions, uploads proof, and submits a pending-payment request. The mutation snapshots the selected price and sets `pending_payment`.

Admin billing queries list pending subscriptions with signed proof URLs, past-due subscriptions, counts per tier, and estimated current monthly revenue. Approve validates the pending state, sets `active`, records reviewer/time, and sets the period end from the selected cycle. Reject validates the pending state, records a reason, and leaves the owner able to submit again through an explicit retry path.

A daily Convex cron marks active subscriptions whose period end has passed as `past_due` and logs/sends a reminder. It does not downgrade or disable features.

## Admin dashboard

`/admin` has an admin-only gate and three tabs:

1. Billing: pending proofs, approve/reject actions, past-due follow-up, tier counts, and estimated monthly recurring revenue.
2. Verification: pending identity reviews and pending property reviews, with proof/photo previews and approve/reject actions.
3. Reports: open reports with transitions to reviewed/resolved.

The dashboard uses small, purpose-specific Convex queries and mutations rather than exposing broad unrestricted collections.

## Testing and acceptance criteria

Tests are written first with `convex-test` and Vitest for:

- tier boundaries and total-room aggregation across multiple properties
- recommendation without active-tier mutation
- owner/admin authorization and cross-owner denial
- onboarding rejection below three photos and acceptance with three valid images
- property-photo persistence and public photo URLs
- pending subscription submission, approve, reject, and period-end calculation
- past-due cron behavior without downgrade/blocking
- verification and report status transitions

Typecheck, lint, the full Vitest suite, and a production build must pass before completion. No payment gateway, complex role-management UI, automatic downgrade, or verification-based feature lock is included.
