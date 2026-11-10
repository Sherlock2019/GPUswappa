-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER', 'REVIEWER', 'BROKER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('DATA_CENTRE', 'CLOUD_PROVIDER', 'AI_STARTUP', 'ENTERPRISE', 'SYSTEM_INTEGRATOR', 'RESELLER', 'RESEARCH_INSTITUTION', 'OTHER');

-- CreateEnum
CREATE TYPE "CompanyVerification" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'NEEDS_INFO', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MembershipAuth" AS ENUM ('PENDING', 'AUTHORIZED', 'REVOKED');

-- CreateEnum
CREATE TYPE "Manufacturer" AS ENUM ('NVIDIA', 'AMD', 'INTEL', 'SERVER_MANUFACTURER', 'OTHER');

-- CreateEnum
CREATE TYPE "Condition" AS ENUM ('NEW', 'UNUSED', 'USED', 'REFURBISHED');

-- CreateEnum
CREATE TYPE "TriState" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OwnershipAnswer" AS ENUM ('OWNS', 'AUTHORIZED', 'NO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Encumbrance" AS ENUM ('NONE', 'LEASED', 'FINANCED', 'OTHER_RIGHTS', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CustomsStatus" AS ENUM ('CLEARED_DOMESTIC', 'OTHER_KNOWN', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE', 'SWAP', 'SALE_OR_SWAP');

-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('MANUFACTURER', 'SELLER', 'NONE', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('INTERMEDIARY', 'SELLER');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'NEEDS_INFO', 'ON_HOLD', 'PUBLISHED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CheckType" AS ENUM ('SELLER_IDENTITY', 'SELLER_AUTHORITY', 'OWNERSHIP_EVIDENCE', 'FINANCING_LEASE', 'CUSTOMS_STATUS', 'ASSET_IDENTIFICATION', 'TECHNICAL_CONDITION', 'WARRANTY_EVIDENCE', 'DATA_SANITISATION', 'EXPORT_CONTROL');

-- CreateEnum
CREATE TYPE "CheckStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'NEEDS_INFO', 'PASSED', 'FAILED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "ReviewOutcome" AS ENUM ('APPROVE', 'RETURN_FOR_INFO', 'HOLD', 'REJECT', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('COMPANY_REGISTRATION', 'SELLER_AUTHORIZATION', 'PURCHASE_INVOICE', 'ALTERNATIVE_OWNERSHIP_EVIDENCE', 'CUSTOMS_DECLARATION', 'LEASE_OR_FINANCE', 'TECHNICAL_REPORT', 'WARRANTY', 'DATA_SANITISATION_REPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('ACTIVE', 'SCHEDULED_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "ImageApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'BUYER_VERIFICATION_REQUIRED', 'UNDER_BROKER_REVIEW', 'QUESTIONS_RELAYED', 'OFFER_RECEIVED', 'NEGOTIATING', 'INSPECTION_REQUESTED', 'INTRODUCTION_PENDING', 'INTRODUCED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('BUYER_BROKER', 'SELLER_BROKER', 'INTERNAL', 'SHARED');

-- CreateEnum
CREATE TYPE "OfferParty" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('SUBMITTED', 'RELAYED', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'AWAITING_SELLER_REVIEW', 'ACCEPTED', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "FeeTrigger" AS ENUM ('SALE_AGREEMENT_SIGNED', 'PAYMENT_PENDING', 'EQUIPMENT_DELIVERED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "IntroductionStatus" AS ENUM ('NOT_REQUESTED', 'PENDING_REVIEW', 'MORE_INFO_REQUIRED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExistingRelationship" AS ENUM ('NOT_DECLARED', 'NONE', 'KNOWN_BUYER', 'ACTIVE_NEGOTIATION');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('VIDEO', 'ON_SITE', 'INDEPENDENT_PARTNER');

-- CreateEnum
CREATE TYPE "InspectionOutcome" AS ENUM ('SCHEDULED', 'PASSED', 'ISSUES_FOUND', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('ENQUIRY', 'NEGOTIATION', 'INSPECTION', 'OFFER_ACCEPTED', 'INTRODUCTION_APPROVED', 'SALE_AGREEMENT_PENDING', 'SALE_AGREEMENT_SIGNED', 'PAYMENT_PENDING', 'EQUIPMENT_DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('NOT_YET_EARNED', 'PENDING_TRIGGER', 'DUE', 'INVOICED', 'PAID', 'OVERDUE', 'DISPUTED', 'WAIVED');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('NONE', 'OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ListingFeeStatus" AS ENUM ('NOT_DUE', 'DUE', 'PAID', 'OVERDUE', 'WAIVED');

-- CreateEnum
CREATE TYPE "SwapStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'FORWARDED', 'DECLINED', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashDirection" AS ENUM ('NONE', 'PROPOSER_PAYS', 'PROPOSER_RECEIVES');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'MATCHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "PartnerCategory" AS ENUM ('DATA_CENTRE', 'SYSTEM_INTEGRATOR', 'RESELLER', 'ITAD_SANITISATION', 'LEGAL_CUSTOMS', 'LOGISTICS', 'BANK_PAYMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "InboxStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('GENERAL', 'REPORT_LISTING', 'SELLER_SUPPORT', 'BUYER_SUPPORT');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('AVAILABLE', 'AVAILABLE_THROUGH_PARTNER', 'COMING_SOON', 'CONTACT_US');

-- CreateEnum
CREATE TYPE "DecisionKind" AS ENUM ('RECOMMENDATION', 'DECISION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BUYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" TEXT NOT NULL DEFAULT 'vi',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "legalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "address" TEXT NOT NULL,
    "locationId" TEXT,
    "website" TEXT,
    "foreignInvested" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "CompanyVerification" NOT NULL DEFAULT 'PENDING',
    "verificationNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "roleInCompany" TEXT NOT NULL DEFAULT 'Owner',
    "authorizationStatus" "MembershipAuth" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpuModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "manufacturer" "Manufacturer" NOT NULL,
    "memoryGb" INTEGER,
    "exportReviewFlag" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "GpuModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "sellerCompanyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "contentLanguage" TEXT NOT NULL DEFAULT 'vi',
    "categoryId" TEXT,
    "manufacturer" "Manufacturer",
    "gpuModelId" TEXT,
    "gpuModelOther" TEXT,
    "gpuQuantity" INTEGER NOT NULL DEFAULT 0,
    "gpuMemory" TEXT,
    "serverManufacturer" TEXT,
    "serverModel" TEXT,
    "cpu" TEXT,
    "systemRam" TEXT,
    "storage" TEXT,
    "networking" TEXT,
    "powerRequirements" TEXT,
    "coolingRequirements" TEXT,
    "condition" "Condition",
    "hasKnownFaults" "TriState",
    "knownDefects" TEXT,
    "usageDetails" TEXT,
    "equipmentAge" TEXT,
    "locationId" TEXT,
    "inVietnam" "TriState",
    "ownership" "OwnershipAnswer",
    "encumbrance" "Encumbrance",
    "customsStatus" "CustomsStatus",
    "customsNotes" TEXT,
    "serialNumbers" TEXT,
    "priceVnd" BIGINT,
    "priceOnRequest" BOOLEAN NOT NULL DEFAULT false,
    "priceIllustrative" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "transactionType" "TransactionType",
    "warrantyStatus" "WarrantyStatus",
    "warrantyDetails" TEXT,
    "deliveryOptions" TEXT,
    "installationOptions" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'INTERMEDIARY',
    "publicationStatus" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "exportReviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "assignedReviewerId" TEXT,
    "brokerId" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "escalationNote" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "lastVerifiedAt" TIMESTAMP(3),

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingImage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "altText" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "approvalStatus" "ImageApproval" NOT NULL DEFAULT 'PENDING',
    "isIllustrative" BOOLEAN NOT NULL DEFAULT false,
    "credit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "listingId" TEXT,
    "companyId" TEXT,
    "type" "DocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewStatus" "DocReviewStatus" NOT NULL DEFAULT 'PENDING',
    "retentionStatus" "RetentionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCheck" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "checkType" "CheckType" NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "internalNotes" TEXT,
    "evidenceRef" TEXT,
    "publicBadge" BOOLEAN NOT NULL DEFAULT false,
    "nextReviewAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" "DecisionKind" NOT NULL DEFAULT 'DECISION',
    "outcome" "ReviewOutcome" NOT NULL,
    "reason" TEXT,
    "override" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewMessage" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "fromStaff" BOOLEAN NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeDefinition" (
    "checkType" "CheckType" NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "meaningEn" TEXT NOT NULL,
    "notMeaningVi" TEXT NOT NULL,
    "notMeaningEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("checkType")
);

-- CreateTable
CREATE TABLE "SavedListing" (
    "userId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedListing_pkey" PRIMARY KEY ("userId","listingId")
);

-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerCompanyId" TEXT,
    "sellerCompanyId" TEXT NOT NULL,
    "brokerId" TEXT,
    "message" TEXT NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "sellerChannelOpen" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relayOfId" TEXT,
    "approvedById" TEXT,
    "flaggedContactInfo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "fromParty" "OfferParty" NOT NULL,
    "amount" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "terms" TEXT,
    "status" "OfferStatus" NOT NULL DEFAULT 'SUBMITTED',
    "recordedById" TEXT NOT NULL,
    "relayedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerageAgreement" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "sellerCompanyId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "authorizedRepresentative" TEXT,
    "listingFeeUsdEquivalent" INTEGER NOT NULL DEFAULT 100,
    "feeCurrencyBasis" TEXT NOT NULL DEFAULT 'USD-equivalent; billing currency and FX basis per invoice',
    "standardCommissionPct" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "negotiatedCommissionPct" DECIMAL(5,2),
    "negotiatedNote" TEXT,
    "commissionPayer" TEXT NOT NULL DEFAULT 'SELLER',
    "salePriceBasis" TEXT NOT NULL DEFAULT 'Agreed equipment sale price',
    "taxesIncluded" BOOLEAN NOT NULL DEFAULT false,
    "shippingIncluded" BOOLEAN NOT NULL DEFAULT false,
    "installationIncluded" BOOLEAN NOT NULL DEFAULT false,
    "feeTrigger" "FeeTrigger" NOT NULL DEFAULT 'SALE_AGREEMENT_SIGNED',
    "paymentDeadlineDays" INTEGER NOT NULL DEFAULT 14,
    "listingFeeCredit" BOOLEAN NOT NULL DEFAULT false,
    "existingBuyerDeclaration" TEXT,
    "introProtectionMonths" INTEGER,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "documentVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptanceMethod" TEXT,
    "acceptedById" TEXT,
    "acceptedIp" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerageAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerIntroAgreement" (
    "id" TEXT NOT NULL,
    "buyerCompanyId" TEXT,
    "buyerUserId" TEXT NOT NULL,
    "authorizedRepresentative" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "termsVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptanceMethod" TEXT NOT NULL DEFAULT 'WEB_CHECKBOX',
    "brokerId" TEXT,

    CONSTRAINT "BuyerIntroAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Introduction" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerCompanyId" TEXT NOT NULL,
    "buyerCompanyId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "approverId" TEXT,
    "status" "IntroductionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "purpose" TEXT NOT NULL,
    "sellerFieldsToBuyer" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "buyerFieldsToSeller" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "existingRelationship" "ExistingRelationship" NOT NULL DEFAULT 'NOT_DECLARED',
    "existingRelationshipNote" TEXT,
    "sellerDeclaredAt" TIMESTAMP(3),
    "checklist" JSONB,
    "agreementVersions" JSONB,
    "notes" TEXT,
    "evidenceRef" TEXT,
    "reviewNote" TEXT,
    "sharedChannelEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Introduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disclosure" (
    "id" TEXT NOT NULL,
    "introductionId" TEXT NOT NULL,
    "authorizedById" TEXT NOT NULL,
    "recipientCompanyId" TEXT NOT NULL,
    "subjectCompanyId" TEXT NOT NULL,
    "fields" TEXT[],
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Disclosure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "shareLocation" BOOLEAN NOT NULL DEFAULT false,
    "participants" TEXT,
    "provider" TEXT,
    "reportRef" TEXT,
    "outcome" "InspectionOutcome" NOT NULL DEFAULT 'SCHEDULED',
    "followUp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "enquiryId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "sellerCompanyId" TEXT NOT NULL,
    "buyerCompanyId" TEXT,
    "brokerId" TEXT NOT NULL,
    "agreementId" TEXT,
    "introductionId" TEXT,
    "salePrice" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT',
    "commissionPct" DECIMAL(5,2),
    "commissionFixed" BIGINT,
    "commissionBasis" TEXT NOT NULL DEFAULT 'Agreed equipment sale price',
    "commissionAmount" BIGINT,
    "listingFeeCredit" BIGINT,
    "feePayer" TEXT NOT NULL DEFAULT 'SELLER',
    "feeTrigger" "FeeTrigger" NOT NULL DEFAULT 'SALE_AGREEMENT_SIGNED',
    "status" "TransactionStatus" NOT NULL DEFAULT 'ENQUIRY',
    "completionEvidence" TEXT,
    "invoiceRef" TEXT,
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'NOT_YET_EARNED',
    "disputeStatus" "DisputeStatus" NOT NULL DEFAULT 'NONE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingFee" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "usdEquivalent" INTEGER NOT NULL DEFAULT 100,
    "billedCurrency" TEXT,
    "billedAmount" BIGINT,
    "fxBasis" TEXT,
    "invoiceRef" TEXT,
    "taxTreatment" TEXT,
    "status" "ListingFeeStatus" NOT NULL DEFAULT 'NOT_DUE',
    "reason" TEXT,
    "paidAt" TIMESTAMP(3),
    "recordedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListingFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwapProposal" (
    "id" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "proposerCompanyId" TEXT,
    "listingId" TEXT,
    "offeredEquipment" TEXT NOT NULL,
    "offeredCondition" "Condition" NOT NULL,
    "offeredDetails" TEXT NOT NULL,
    "offeredEstimatedValue" BIGINT,
    "requestedEquipment" TEXT NOT NULL,
    "requestedEstimatedValue" BIGINT,
    "cashDirection" "CashDirection" NOT NULL DEFAULT 'NONE',
    "cashAdjustment" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "preferredLocationId" TEXT,
    "proposedTiming" TEXT,
    "status" "SwapStatus" NOT NULL DEFAULT 'SUBMITTED',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerRequest" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "buyerCompanyId" TEXT,
    "categoryId" TEXT,
    "gpuModelId" TEXT,
    "desiredEquipment" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "locationId" TEXT,
    "conditionPreference" TEXT NOT NULL DEFAULT 'ANY',
    "budgetMinVnd" BIGINT,
    "budgetMaxVnd" BIGINT,
    "hideBudget" BOOLEAN NOT NULL DEFAULT true,
    "desiredDeliveryDate" TIMESTAMP(3),
    "requirements" TEXT,
    "contactPreference" TEXT NOT NULL DEFAULT 'PLATFORM',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerEnquiry" (
    "id" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "partnerCategory" "PartnerCategory" NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InboxStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "type" "ContactType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organization" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "listingId" TEXT,
    "userId" TEXT,
    "status" "InboxStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Service" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "nameVi" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "descriptionVi" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'CONTACT_US',
    "certificationNote" TEXT,
    "certificationEvidenceRef" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPage" (
    "slug" TEXT NOT NULL,
    "titleVi" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyVi" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "isLegalDraft" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPage_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_alias_key" ON "Company"("alias");

-- CreateIndex
CREATE INDEX "Company_verificationStatus_idx" ON "Company"("verificationStatus");

-- CreateIndex
CREATE INDEX "CompanyMembership_companyId_idx" ON "CompanyMembership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMembership_userId_companyId_key" ON "CompanyMembership"("userId", "companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GpuModel_name_key" ON "GpuModel"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Location_code_key" ON "Location"("code");

-- CreateIndex
CREATE INDEX "Listing_publicationStatus_publishedAt_idx" ON "Listing"("publicationStatus", "publishedAt");

-- CreateIndex
CREATE INDEX "Listing_sellerCompanyId_idx" ON "Listing"("sellerCompanyId");

-- CreateIndex
CREATE INDEX "Listing_categoryId_idx" ON "Listing"("categoryId");

-- CreateIndex
CREATE INDEX "Listing_gpuModelId_idx" ON "Listing"("gpuModelId");

-- CreateIndex
CREATE INDEX "Listing_locationId_idx" ON "Listing"("locationId");

-- CreateIndex
CREATE INDEX "Listing_priceVnd_idx" ON "Listing"("priceVnd");

-- CreateIndex
CREATE UNIQUE INDEX "ListingImage_storageKey_key" ON "ListingImage"("storageKey");

-- CreateIndex
CREATE INDEX "ListingImage_listingId_sortOrder_idx" ON "ListingImage"("listingId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_listingId_idx" ON "Document"("listingId");

-- CreateIndex
CREATE INDEX "Document_companyId_idx" ON "Document"("companyId");

-- CreateIndex
CREATE INDEX "Document_reviewStatus_idx" ON "Document"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCheck_listingId_checkType_key" ON "ReviewCheck"("listingId", "checkType");

-- CreateIndex
CREATE INDEX "ReviewDecision_listingId_createdAt_idx" ON "ReviewDecision"("listingId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewMessage_listingId_createdAt_idx" ON "ReviewMessage"("listingId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_reference_key" ON "Enquiry"("reference");

-- CreateIndex
CREATE INDEX "Enquiry_buyerId_idx" ON "Enquiry"("buyerId");

-- CreateIndex
CREATE INDEX "Enquiry_sellerCompanyId_status_idx" ON "Enquiry"("sellerCompanyId", "status");

-- CreateIndex
CREATE INDEX "Enquiry_brokerId_status_idx" ON "Enquiry"("brokerId", "status");

-- CreateIndex
CREATE INDEX "Message_enquiryId_channel_createdAt_idx" ON "Message"("enquiryId", "channel", "createdAt");

-- CreateIndex
CREATE INDEX "Offer_enquiryId_createdAt_idx" ON "Offer"("enquiryId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerageAgreement_reference_key" ON "BrokerageAgreement"("reference");

-- CreateIndex
CREATE INDEX "BrokerageAgreement_listingId_status_idx" ON "BrokerageAgreement"("listingId", "status");

-- CreateIndex
CREATE INDEX "BuyerIntroAgreement_enquiryId_idx" ON "BuyerIntroAgreement"("enquiryId");

-- CreateIndex
CREATE INDEX "Introduction_status_idx" ON "Introduction"("status");

-- CreateIndex
CREATE INDEX "Introduction_enquiryId_idx" ON "Introduction"("enquiryId");

-- CreateIndex
CREATE INDEX "Disclosure_recipientCompanyId_idx" ON "Disclosure"("recipientCompanyId");

-- CreateIndex
CREATE INDEX "Inspection_scheduledAt_idx" ON "Inspection"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reference_key" ON "Transaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_enquiryId_key" ON "Transaction"("enquiryId");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE INDEX "Transaction_brokerId_idx" ON "Transaction"("brokerId");

-- CreateIndex
CREATE INDEX "ListingFee_listingId_periodStart_idx" ON "ListingFee"("listingId", "periodStart");

-- CreateIndex
CREATE INDEX "ListingFee_status_idx" ON "ListingFee"("status");

-- CreateIndex
CREATE INDEX "SwapProposal_proposerId_idx" ON "SwapProposal"("proposerId");

-- CreateIndex
CREATE INDEX "SwapProposal_status_idx" ON "SwapProposal"("status");

-- CreateIndex
CREATE INDEX "BuyerRequest_buyerId_idx" ON "BuyerRequest"("buyerId");

-- CreateIndex
CREATE INDEX "BuyerRequest_visibility_status_idx" ON "BuyerRequest"("visibility", "status");

-- CreateIndex
CREATE INDEX "PartnerEnquiry_status_idx" ON "PartnerEnquiry"("status");

-- CreateIndex
CREATE INDEX "ContactSubmission_type_status_idx" ON "ContactSubmission"("type", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "Service_key_key" ON "Service"("key");

-- CreateIndex
CREATE INDEX "AuditEvent_resourceType_resourceId_idx" ON "AuditEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMembership" ADD CONSTRAINT "CompanyMembership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_sellerCompanyId_fkey" FOREIGN KEY ("sellerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_gpuModelId_fkey" FOREIGN KEY ("gpuModelId") REFERENCES "GpuModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingImage" ADD CONSTRAINT "ListingImage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCheck" ADD CONSTRAINT "ReviewCheck_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCheck" ADD CONSTRAINT "ReviewCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMessage" ADD CONSTRAINT "ReviewMessage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewMessage" ADD CONSTRAINT "ReviewMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedListing" ADD CONSTRAINT "SavedListing_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_sellerCompanyId_fkey" FOREIGN KEY ("sellerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_relayOfId_fkey" FOREIGN KEY ("relayOfId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerageAgreement" ADD CONSTRAINT "BrokerageAgreement_sellerCompanyId_fkey" FOREIGN KEY ("sellerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerageAgreement" ADD CONSTRAINT "BrokerageAgreement_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerageAgreement" ADD CONSTRAINT "BrokerageAgreement_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerIntroAgreement" ADD CONSTRAINT "BuyerIntroAgreement_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerIntroAgreement" ADD CONSTRAINT "BuyerIntroAgreement_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerIntroAgreement" ADD CONSTRAINT "BuyerIntroAgreement_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerIntroAgreement" ADD CONSTRAINT "BuyerIntroAgreement_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_sellerCompanyId_fkey" FOREIGN KEY ("sellerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Introduction" ADD CONSTRAINT "Introduction_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_introductionId_fkey" FOREIGN KEY ("introductionId") REFERENCES "Introduction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disclosure" ADD CONSTRAINT "Disclosure_authorizedById_fkey" FOREIGN KEY ("authorizedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sellerCompanyId_fkey" FOREIGN KEY ("sellerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "BrokerageAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_introductionId_fkey" FOREIGN KEY ("introductionId") REFERENCES "Introduction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFee" ADD CONSTRAINT "ListingFee_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingFee" ADD CONSTRAINT "ListingFee_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapProposal" ADD CONSTRAINT "SwapProposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapProposal" ADD CONSTRAINT "SwapProposal_proposerCompanyId_fkey" FOREIGN KEY ("proposerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapProposal" ADD CONSTRAINT "SwapProposal_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapProposal" ADD CONSTRAINT "SwapProposal_preferredLocationId_fkey" FOREIGN KEY ("preferredLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_buyerCompanyId_fkey" FOREIGN KEY ("buyerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_gpuModelId_fkey" FOREIGN KEY ("gpuModelId") REFERENCES "GpuModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerRequest" ADD CONSTRAINT "BuyerRequest_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
