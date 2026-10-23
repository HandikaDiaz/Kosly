import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import { authTables } from "@convex-dev/auth/server"

const paymentStatus = v.union(
  v.literal("pending_review"),
  v.literal("confirmed"),
  v.literal("rejected")
)

export default defineSchema({
  ...authTables,
  owners: defineTable({
    userId: v.optional(v.id("users")),
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.union(v.literal("owner"), v.literal("admin"))),
    identityVerificationStatus: v.optional(
      v.union(
        v.literal("not_submitted"),
        v.literal("pending_review"),
        v.literal("verified"),
        v.literal("rejected")
      )
    ),
    identityVerificationReviewedAt: v.optional(v.number()),
    identityVerificationRejectionReason: v.optional(v.string()),
    identityVerificationFilesDeleteAfter: v.optional(v.number()),
    ktpStorageId: v.optional(v.id("_storage")),
    selfieStorageId: v.optional(v.id("_storage")),
    onboardingCompleted: v.optional(v.boolean()),
    createdAt: v.optional(v.number()),
  })
    .index("by_user_id", ["userId"])
    .index("by_token_identifier", ["tokenIdentifier"])
    .index("by_email", ["email"])
    .index("by_ktp_storage", ["ktpStorageId"])
    .index("by_selfie_storage", ["selfieStorageId"])
    .index("by_identity_retention", [
      "identityVerificationStatus",
      "identityVerificationFilesDeleteAfter",
    ]),
  properties: defineTable({
    ownerId: v.id("owners"),
    name: v.string(),
    address: v.string(),
    slug: v.string(),
    isActive: v.boolean(),
    // lockedByTier: system-enforced lock when owner's subscription is downgraded.
    // Separate from isActive (owner-controlled). Both must be true/false independently.
    lockedByTier: v.optional(v.boolean()),
    propertyVerificationStatus: v.optional(
      v.union(
        v.literal("not_submitted"),
        v.literal("pending_review"),
        v.literal("verified"),
        v.literal("rejected")
      )
    ),
    propertyVerificationReviewedAt: v.optional(v.number()),
    propertyVerificationRejectionReason: v.optional(v.string()),
    ownershipProofStorageId: v.optional(v.id("_storage")),
    publicSlug: v.optional(v.string()),
    previousSlugs: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),
    publicDescription: v.optional(v.string()),
    publicAreaLabel: v.optional(v.string()),
    publicPhotoIds: v.optional(v.array(v.id("property_photos"))),
    publicShowPrice: v.optional(v.boolean()),
    publicShowFullAddress: v.optional(v.boolean()),
    publicLat: v.optional(v.number()),
    publicLng: v.optional(v.number()),
    publicGridCell: v.optional(v.string()),
    contactForApplicants: v.optional(v.string()),
    pinLat: v.optional(v.number()),
    pinLng: v.optional(v.number()),
    locationVerificationStatus: v.optional(
      v.union(
        v.literal("unverified"),
        v.literal("pending_review"),
        v.literal("verified")
      )
    ),
    locationVerifiedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_slug", ["slug"])
    .index("by_public_slug", ["publicSlug"])
    .index("by_is_published", ["isPublished"])
    .index("by_ownership_proof_storage", ["ownershipProofStorageId"])
    .index("by_owner_and_locked", ["ownerId", "lockedByTier"])
    .index("by_public_grid_cell", ["publicGridCell", "isPublished"]),
  subscriptions: defineTable({
    ownerId: v.id("owners"),
    tier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("pro")
    ),
    billingCycle: v.union(
      v.literal("monthly"),
      v.literal("annual"),
      v.literal("none")
    ),
    priceAmount: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("pending_payment"),
      v.literal("past_due"),
      v.literal("canceled")
    ),
    currentPeriodEnd: v.optional(v.number()),
    roomCountAtLastCheck: v.number(),
    proofStorageId: v.optional(v.id("_storage")),
    reviewedByOwnerId: v.optional(v.id("owners")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"]),
  property_photos: defineTable({
    propertyId: v.id("properties"),
    storageId: v.id("_storage"),
    sortOrder: v.number(),
    caption: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_property", ["propertyId"]),
  locationCaptures: defineTable({
    propertyId: v.id("properties"),
    kind: v.union(v.literal("front"), v.literal("street"), v.literal("room")),
    storageId: v.id("_storage"),
    lat: v.number(),
    lng: v.number(),
    accuracyM: v.number(),
    distanceM: v.number(),
    serverCapturedAt: v.number(),
    clientCapturedAt: v.number(),
    status: v.union(
      v.literal("passed"),
      v.literal("needs_review"),
      v.literal("rejected")
    ),
    reason: v.optional(v.string()),
    supersededAt: v.optional(v.number()),
  })
    // Convex indexes already append _creationTime as a tiebreaker, so a
    // second index with only propertyId would be identical to by_property.
    .index("by_property", ["propertyId"]),
  reports: defineTable({
    reporterOwnerId: v.optional(v.id("owners")),
    reporterTenantId: v.optional(v.id("tenants")),
    propertyId: v.optional(v.id("properties")),
    description: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("reviewed"),
      v.literal("resolved")
    ),
    reviewedByOwnerId: v.optional(v.id("owners")),
    reviewedAt: v.optional(v.number()),
    resolutionNote: v.optional(v.string()),
  }).index("by_status", ["status"]),
  support_tickets: defineTable({
    ownerId: v.optional(v.id("owners")),
    name: v.string(),
    contactEmail: v.string(),
    category: v.union(
      v.literal("bug"),
      v.literal("masukan"),
      v.literal("lain_lain")
    ),
    subject: v.string(),
    message: v.string(),
    status: v.union(
      v.literal("open"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("closed")
    ),
    priorityTier: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("pro"),
      v.literal("guest")
    ),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_status", ["status"])
    .index("by_category", ["category"]),
  support_ticket_replies: defineTable({
    ticketId: v.id("support_tickets"),
    sender: v.union(v.literal("admin"), v.literal("user")),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_ticket", ["ticketId"]),
  rooms: defineTable({
    propertyId: v.id("properties"),
    roomNumber: v.string(),
    status: v.union(
      v.literal("available"),
      v.literal("booked"),
      v.literal("occupied")
    ),
    monthlyRent: v.number(),
    floor: v.optional(v.string()),
    roomType: v.optional(v.string()),
    sizeSqm: v.optional(v.number()),
    maxOccupants: v.optional(v.number()),
    genderCategory: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("mixed"))
    ),
    bathroomType: v.optional(
      v.union(v.literal("private"), v.literal("shared"), v.literal("none"))
    ),
    bathroomFacilities: v.optional(v.array(v.string())),
    furnitureElectronics: v.optional(v.array(v.string())),
    bedSize: v.optional(v.string()),
    annualRent: v.optional(v.number()),
    depositFee: v.optional(v.number()),
    dpAmount: v.optional(v.number()),
    dp_max_days: v.optional(v.number()),
    electricityStatus: v.optional(
      v.union(
        v.literal("included"),
        v.literal("metered"),
        v.literal("excluded")
      )
    ),
    additionalFees: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_property", ["propertyId"])
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_property_and_room_number", ["propertyId", "roomNumber"]),
  property_facilities: defineTable({
    propertyId: v.id("properties"),
    category: v.union(
      v.literal("shared"),
      v.literal("services"),
      v.literal("parking"),
      v.literal("security"),
      v.literal("sports"),
      v.literal("other")
    ),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_property", ["propertyId"])
    .index("by_property_and_category", ["propertyId", "category"]),
  room_media: defineTable({
    roomId: v.id("rooms"),
    kind: v.union(v.literal("photo"), v.literal("video")),
    storageId: v.id("_storage"),
    sortOrder: v.number(),
    caption: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_kind", ["roomId", "kind"]),
  tenants: defineTable({
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    name: v.string(),
    phone: v.string(),
    tenantPhoneNormalized: v.optional(v.string()),
    startedAt: v.number(),
    dueDay: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("active"),
      v.literal("inactive")
    ),
    leaseDecision: v.optional(
      v.union(
        v.literal("undecided"),
        v.literal("continue"),
        v.literal("not_continuing")
      )
    ),
    leaseEndsAt: v.optional(v.number()),
    // Lifecycle state machine (separate from billing status)
    payment_type: v.optional(
      v.union(v.literal("bulanan"), v.literal("tahunan"))
    ),
    lifecycle_status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("akan_pindah"),
        v.literal("moved_out")
      )
    ),
    move_out_date: v.optional(v.number()),
    flagged_overdue_at: v.optional(v.number()),
    deposit_refund_status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("refunded"),
        v.literal("forfeited")
      )
    ),
    deposit_refund_reminded_at: v.optional(v.number()),
  })
    .index("by_property", ["propertyId"])
    .index("by_room", ["roomId"])
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_status_and_due_day", ["status", "dueDay"])
    .index("by_lifecycle_and_move_out", ["lifecycle_status", "move_out_date"])
    .index("by_lifecycle_and_refund_status", [
      "lifecycle_status",
      "deposit_refund_status",
    ])
    .index("by_tenant_phone_normalized", ["tenantPhoneNormalized"]),
  rent_charges: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    roomId: v.id("rooms"),
    period: v.string(),
    amount: v.number(),
    dueDate: v.number(),
    status: v.union(
      v.literal("unpaid"),
      v.literal("paid"),
      v.literal("waived")
    ),
    paymentId: v.optional(v.id("payments")),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_tenant_and_period", ["tenantId", "period"])
    .index("by_status_and_due_date", ["status", "dueDate"]),
  payments: defineTable({
    propertyId: v.id("properties"),
    tenantId: v.id("tenants"),
    roomId: v.id("rooms"),
    amount: v.number(),
    paymentType: v.optional(v.union(v.literal("dp"), v.literal("full"))),
    purpose: v.optional(
      v.union(
        v.literal("dp"),
        v.literal("pelunasan"),
        v.literal("sewa_bulanan")
      )
    ),
    bookingId: v.optional(v.id("bookings")),
    paidAt: v.number(),
    dueDate: v.number(),
    billingPeriod: v.optional(v.string()),
    status: paymentStatus,
    proofStorageId: v.optional(v.id("_storage")),
    reviewerOwnerId: v.optional(v.id("owners")),
    reviewedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
  })
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_tenant_and_paid_at", ["tenantId", "paidAt"])
    .index("by_tenant_and_due_date", ["tenantId", "dueDate"])
    .index("by_tenant_and_period", ["tenantId", "billingPeriod"]),
  notification_log: defineTable({
    ownerId: v.id("owners"),
    propertyId: v.optional(v.id("properties")),
    tenantId: v.optional(v.id("tenants")),
    type: v.union(
      v.literal("payment_uploaded"),
      v.literal("reminder_due"),
      v.literal("reminder_today"),
      v.literal("reminder_overdue"),
      v.literal("dp_expired"),
      v.literal("settlement_reminder"),
      v.literal("settlement_expired"),
      v.literal("overdue_flag"),
      v.literal("move_out_auto"),
      v.literal("deposit_refund_reminder"),
      v.literal("deposit_refund_followup"),
      v.literal("subscription_upgrade"),
      v.literal("subscription_past_due"),
      v.literal("subscription_downgraded"),
      v.literal("gagal_tanpa_template")
    ),
    channel: v.union(
      v.literal("telegram"),
      v.literal("whatsapp"),
      v.literal("both"),
      v.literal("log_only")
    ),
    occurredOn: v.string(),
    status: v.union(
      v.literal("logged"),
      v.literal("skipped"),
      v.literal("failed")
    ),
    payload: v.string(),
    providerEventId: v.optional(v.string()),
    externalMessageId: v.optional(v.string()),
    actionReference: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
  })
    .index("by_tenant_and_type_and_date", ["tenantId", "type", "occurredOn"])
    .index("by_owner_and_type", ["ownerId", "type"])
    .index("by_provider_event", ["providerEventId"]),
  sensitive_file_access_log: defineTable({
    accessedBy: v.id("owners"),
    fileType: v.union(
      v.literal("ktp"),
      v.literal("selfie"),
      v.literal("ownership_proof")
    ),
    ownerId: v.id("owners"),
    accessedAt: v.number(),
  })
    .index("by_owner_and_accessed_at", ["ownerId", "accessedAt"])
    .index("by_accessor_and_accessed_at", ["accessedBy", "accessedAt"]),
  bot_links: defineTable({
    ownerId: v.id("owners"),
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    chatId: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    displayName: v.optional(v.string()),
    createdAt: v.number(),
    lastSeenAt: v.optional(v.number()),
  })
    .index("by_owner_and_channel", ["ownerId", "channel"])
    .index("by_channel_and_chat_id", ["channel", "chatId"]),
  waWindows: defineTable({
    phoneHash: v.string(),
    lastInboundAt: v.number(),
  }).index("by_phone_hash", ["phoneHash"]),
  waDeliveryLog: defineTable({
    kind: v.string(),
    phoneHash: v.string(),
    at: v.number(),
    mode: v.union(v.literal("text"), v.literal("template"), v.literal("skipped")),
    ok: v.boolean(),
    errorCode: v.optional(v.string()),
    idempotencyKey: v.string(),
    externalMessageId: v.optional(v.string()),
  }).index("by_kind_and_idempotency", ["kind", "idempotencyKey"]).index("by_external_message_id", ["externalMessageId"]),
  waDailyStats: defineTable({
    date: v.string(),
    templateCount: v.number(),
    byKind: v.record(v.string(), v.number()),
    textCount: v.number(),
  }).index("by_date", ["date"]),
  bot_sessions: defineTable({
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    chatId: v.string(),
    ownerId: v.id("owners"),
    kind: v.union(
      v.literal("upgrade_selection"),
      v.literal("upgrade_payment"),
      v.literal("admin_confirmation")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("expired")
    ),
    selectedTier: v.optional(
      v.union(v.literal("starter"), v.literal("growth"), v.literal("pro"))
    ),
    selectedBillingCycle: v.optional(
      v.union(v.literal("monthly"), v.literal("annual"))
    ),
    targetType: v.optional(
      v.union(
        v.literal("verification_identity"),
        v.literal("verification_property"),
        v.literal("subscription"),
        v.literal("report")
      )
    ),
    targetId: v.optional(v.string()),
    reference: v.optional(v.string()),
    decision: v.optional(v.union(v.literal("approve"), v.literal("reject"))),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_chat", ["channel", "chatId", "status"])
    .index("by_owner", ["ownerId", "status"]),
  bot_conversation_state: defineTable({
    chatId: v.string(),
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    ownerId: v.id("owners"),
    flowType: v.string(),
    currentStep: v.union(
      v.literal("property"),
      v.literal("room_number"),
      v.literal("monthly_rent"),
      v.literal("photo")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("expired"),
      v.literal("completed"),
      v.literal("canceled")
    ),
    collectedData: v.object({
      propertyId: v.optional(v.id("properties")),
      roomNumber: v.optional(v.string()),
      monthlyRent: v.optional(v.number()),
    }),
    expiresAt: v.number(),
  })
    .index("by_chat_and_status", ["channel", "chatId", "status"])
    .index("by_owner_and_status", ["ownerId", "status"]),
  monthly_reports: defineTable({
    ownerId: v.id("owners"),
    propertyId: v.id("properties"),
    period: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    generatedAt: v.number(),
  })
    .index("by_owner_and_period", ["ownerId", "period"])
    .index("by_property_and_period", ["propertyId", "period"]),
  bookings: defineTable({
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    tenantId: v.id("tenants"),
    depositAmount: v.number(),
    deadlineAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("locked"),
      v.literal("paid_off"),
      v.literal("expired")
    ),
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
    expiredAt: v.optional(v.number()),
    // DP booking settlement flow
    dp_confirmed_at: v.optional(v.number()),
    settlement_deadline: v.optional(v.number()),
  })
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_room_and_status", ["roomId", "status"])
    .index("by_status_and_deadline", ["status", "deadlineAt"])
    .index("by_tenant", ["tenantId"])
    .index("by_status_and_settlement_deadline", [
      "status",
      "settlement_deadline",
    ]),
  reviewInvitations: defineTable({
    propertyId: v.id("properties"),
    tenancyId: v.id("tenants"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    deliveryChannel: v.optional(v.union(v.literal("whatsapp"), v.literal("telegram"))),
    deliveryAttempts: v.optional(v.number()),
    lastDeliveryError: v.optional(v.string()),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_tenancy", ["tenancyId"])
    .index("by_property", ["propertyId"]),
  reviews: defineTable({
    propertyId: v.id("properties"),
    tenancyId: v.id("tenants"),
    invitationId: v.id("reviewInvitations"),
    rating: v.number(),
    text: v.optional(v.string()),
    stayDays: v.number(),
    createdAt: v.number(),
    status: v.union(v.literal("published"), v.literal("hidden")),
    flaggedForAudit: v.boolean(),
    ownerReply: v.optional(v.object({ text: v.string(), createdAt: v.number() })),
  })
    .index("by_property_and_status", ["propertyId", "status"])
    .index("by_tenancy", ["tenancyId"]),
  reviewStats: defineTable({
    propertyId: v.id("properties"),
    count: v.number(),
    sum: v.number(),
    updatedAt: v.number(),
  }).index("by_property", ["propertyId"]),
  reviewReports: defineTable({
    reviewId: v.id("reviews"),
    propertyId: v.id("properties"),
    reason: v.union(
      v.literal("tidak_pernah_menginap"),
      v.literal("isi_menyerang_atau_palsu"),
      v.literal("data_pribadi"),
      v.literal("lainnya")
    ),
    note: v.optional(v.string()),
    createdAt: v.number(),
    status: v.union(v.literal("open"), v.literal("resolved")),
  })
    .index("by_review", ["reviewId"])
    .index("by_status", ["status"]),
  tenantIdentities: defineTable({
    phoneE164: v.string(),
    verifiedVia: v.union(v.literal("whatsapp"), v.literal("telegram")),
    createdAt: v.number(),
    lastVerifiedAt: v.number(),
    noticeAcceptedAt: v.number(),
    noticeVersion: v.string(),
    status: v.literal("active"),
    lastActiveAt: v.optional(v.number()),
    flaggedForAudit: v.optional(v.boolean()),
  }).index("by_phone", ["phoneE164"]),
  verificationChallenges: defineTable({
    codeHash: v.string(),
    pollSecretHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("awaiting_message"), v.literal("awaiting_confirmation"), v.literal("verified"), v.literal("expired"), v.literal("cancelled")),
    channel: v.optional(v.union(v.literal("whatsapp"), v.literal("telegram"))),
    senderKey: v.optional(v.string()),
    pendingPhoneE164: v.optional(v.string()),
    confirmExpiresAt: v.optional(v.number()),
    identityId: v.optional(v.id("tenantIdentities")),
    claimedAt: v.optional(v.number()),
  }).index("by_code_hash", ["codeHash"]).index("by_created", ["createdAt"]).index("by_identity", ["identityId"]),
  tenantSessions: defineTable({
    identityId: v.id("tenantIdentities"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    revokedAt: v.optional(v.number()),
  }).index("by_token_hash", ["tokenHash"]).index("by_identity", ["identityId"]),
  senderAttempts: defineTable({
    senderKeyHash: v.string(),
    windowStart: v.number(),
    failedCount: v.number(),
  }).index("by_sender_and_window", ["senderKeyHash", "windowStart"]).index("by_window", ["windowStart"]),
  tenancyIdentityLinks: defineTable({
    identityId: v.id("tenantIdentities"),
    tenancyId: v.id("tenants"),
    status: v.union(v.literal("pending"), v.literal("confirmed"), v.literal("rejected")),
    createdAt: v.number(),
    decidedAt: v.optional(v.number()),
  }).index("by_identity", ["identityId"]).index("by_tenancy", ["tenancyId"]),
  tenantConsents: defineTable({
    identityId: v.id("tenantIdentities"),
    purpose: v.literal("share_rapor"),
    textVersion: v.string(),
    textSha256: v.string(),
    grantedAt: v.number(),
    channel: v.literal("web"),
    withdrawnAt: v.optional(v.number()),
  }).index("by_identity_and_purpose", ["identityId", "purpose"]),
  paymentDisputes: defineTable({
    identityId: v.id("tenantIdentities"),
    tenancyId: v.id("tenants"),
    periodId: v.string(),
    reason: v.union(v.literal("sudah_bayar"), v.literal("tanggal_salah"), v.literal("bukan_masa_tinggal_saya"), v.literal("lainnya")),
    note: v.optional(v.string()),
    status: v.union(v.literal("open"), v.literal("resolved_for_tenant"), v.literal("resolved_for_owner"), v.literal("lapsed"), v.literal("withdrawn")),
    createdAt: v.number(),
    ownerRespondedAt: v.optional(v.number()),
    ownerDecision: v.optional(v.union(v.literal("agree"), v.literal("reject"))),
    ownerNote: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  }).index("by_identity", ["identityId"]).index("by_tenancy", ["tenancyId"]).index("by_period", ["periodId"]).index("by_status_and_created", ["status", "createdAt"]),
  identityChannelKeys: defineTable({
    identityId: v.id("tenantIdentities"),
    channel: v.union(v.literal("whatsapp"), v.literal("telegram")),
    senderKeyHash: v.string(),
    createdAt: v.number(),
  }).index("by_channel_and_key", ["channel", "senderKeyHash"]).index("by_identity", ["identityId"]),
  raporShares: defineTable({
    identityId: v.id("tenantIdentities"),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    forLabel: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("revealed"), v.literal("revoked"), v.literal("expired")),
    revealedAt: v.optional(v.number()),
    revealedSummary: v.optional(v.object({ tier: v.string(), tenancyBucket: v.string(), monthsBucket: v.string(), generatedMonth: v.string() })),
    viewTokenHash: v.optional(v.string()),
    viewExpiresAt: v.optional(v.number()),
    createdVia: v.union(v.literal("web"), v.literal("whatsapp"), v.literal("telegram")),
  }).index("by_token_hash", ["tokenHash"]).index("by_identity", ["identityId"]).index("by_status_and_expires", ["status", "expiresAt"]).index("by_view_token_hash", ["viewTokenHash"]),
  botTenantContexts: defineTable({
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    senderKeyHash: v.string(),
    lastResultSlugs: v.array(v.string()),
    lastViewedSlug: v.optional(v.string()),
    updatedAt: v.number(),
    expiresAt: v.number(),
  }).index("by_sender", ["channel", "senderKeyHash"]).index("by_expiry", ["expiresAt"]),
  rentalApplications: defineTable({
    propertyId: v.id("properties"),
    roomId: v.id("rooms"),
    code: v.string(),
    senderKeyHash: v.optional(v.string()),
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    applicantName: v.optional(v.string()),
    applicantPhoneE164: v.optional(v.string()),
    replyChatId: v.optional(v.string()),
    moveInDate: v.string(),
    durationMonths: v.number(),
    note: v.optional(v.string()),
    status: v.union(v.literal("submitted"), v.literal("accepted"), v.literal("registration_submitted"), v.literal("dp_confirmed"), v.literal("declined"), v.literal("cancelled_by_tenant"), v.literal("expired_no_response"), v.literal("declined_auto"), v.literal("hold_released"), v.literal("hold_expired"), v.literal("converted"), v.literal("booking_failed")),
    bookingId: v.optional(v.id("bookings")),
    tenantId: v.optional(v.id("tenants")),
    registrationSubmittedAt: v.optional(v.number()),
    linkAttempts: v.optional(v.number()),
    createdAt: v.number(),
    ownerRespondedAt: v.optional(v.number()),
    acceptedAt: v.optional(v.number()),
    holdExpiresAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    consentVersion: v.string(),
    consentAt: v.number(),
    ownerReminderSentAt: v.optional(v.number()),
    holdReminderSentAt: v.optional(v.number()),
    anonymizedAt: v.optional(v.number()),
  }).index("by_code", ["code"]).index("by_booking", ["bookingId"]).index("by_property_and_status", ["propertyId", "status"]).index("by_room_and_status", ["roomId", "status"]).index("by_sender_and_status", ["senderKeyHash", "status"]).index("by_status_and_hold_expires", ["status", "holdExpiresAt"]).index("by_status_and_created", ["status", "createdAt"]),
  botConversations: defineTable({
    channel: v.union(v.literal("telegram"), v.literal("whatsapp")),
    senderKeyHash: v.string(),
    flow: v.literal("apply"),
    step: v.union(v.literal("room"), v.literal("name"), v.literal("date"), v.literal("duration"), v.literal("note"), v.literal("contact"), v.literal("confirm")),
    draft: v.object({ propertyId: v.optional(v.id("properties")), roomId: v.optional(v.id("rooms")), applicantName: v.optional(v.string()), moveInDate: v.optional(v.string()), durationMonths: v.optional(v.number()), note: v.optional(v.string()), applicantPhoneE164: v.optional(v.string()) }),
    expiresAt: v.number(),
  }).index("by_sender", ["channel", "senderKeyHash"]),
  searchRateLimits: defineTable({
    senderKeyHash: v.string(),
    windowStart: v.number(),
    count: v.number(),
  }).index("by_sender", ["senderKeyHash"]).index("by_window", ["windowStart"]),
})
