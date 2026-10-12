-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "tuitionUsd" INTEGER NOT NULL,
    "livingCostUsd" INTEGER NOT NULL,
    "intlStudentPct" DOUBLE PRECISION NOT NULL,
    "acceptanceRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "logoUrl" TEXT,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "pendingReview" BOOLEAN NOT NULL DEFAULT false,
    "hasHalalFood" BOOLEAN DEFAULT true,
    "hasPrayerFacilities" BOOLEAN DEFAULT true,
    "hasGenderSegregatedHousing" BOOLEAN DEFAULT false,
    "hasFamilyAccommodation" BOOLEAN DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeLevel" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "tuitionUsd" INTEGER NOT NULL,
    "deadline" TEXT,
    "entryReqs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountUsd" INTEGER NOT NULL,
    "amountType" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "deadline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supabaseId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'Jordan',
    "fieldOfInterest" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "ratingOverall" INTEGER NOT NULL,
    "ratingAffordability" INTEGER NOT NULL,
    "ratingVisa" INTEGER NOT NULL,
    "ratingTeaching" INTEGER NOT NULL,
    "ratingSafety" INTEGER NOT NULL,
    "ratingSocial" INTEGER NOT NULL,
    "reviewText" TEXT NOT NULL,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "moderationStatus" TEXT NOT NULL DEFAULT 'approved',
    "verifiedEnrollment" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SavedList" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "listName" TEXT NOT NULL,
    "universities" TEXT NOT NULL DEFAULT '[]',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferPathway" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromUniversityId" TEXT NOT NULL,
    "toUniversityId" TEXT NOT NULL,
    "creditsAccepted" INTEGER NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "agreementType" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "requirements" TEXT,
    "estimatedSavingsUsd" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("fromUniversityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("toUniversityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "universityId" TEXT,
    "userId" TEXT,
    "sessionId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "universityId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentEmail" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION,
    "field" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'free',
    "status" TEXT NOT NULL DEFAULT 'none',
    "currentPeriodEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScrapedUniversity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "website" TEXT,
    "tuitionUsd" INTEGER NOT NULL DEFAULT 0,
    "livingCostUsd" INTEGER NOT NULL DEFAULT 0,
    "intlStudentPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "logoUrl" TEXT,
    "descriptionEn" TEXT,
    "descriptionAr" TEXT,
    "source" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "qualityBreakdown" TEXT,
    "status" TEXT NOT NULL DEFAULT 'manual_review',
    "scrapedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedBy" TEXT,
    "rawData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntakeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "nationality" TEXT,
    "educationLevel" TEXT,
    "fieldOfInterest" TEXT,
    "preferredCountries" TEXT,
    "budgetUsd" INTEGER,
    "languagePref" TEXT,
    "degreeLevel" TEXT,
    "careerGoal" TEXT,
    "specialRequirements" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IntakeMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AgentMatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "relevanceScore" DOUBLE PRECISION NOT NULL,
    "explanation" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("sessionId") REFERENCES "IntakeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseId_key" ON "User"("supabaseId");

-- CreateIndex
CREATE INDEX "Program_universityId_idx" ON "Program"("universityId");

-- CreateIndex
CREATE INDEX "Scholarship_universityId_idx" ON "Scholarship"("universityId");

-- CreateIndex
CREATE INDEX "Review_universityId_moderationStatus_idx" ON "Review"("universityId", "moderationStatus");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "SavedList_userId_idx" ON "SavedList"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedList_shareToken_key" ON "SavedList"("shareToken");

-- CreateIndex
CREATE INDEX "TransferPathway_fromUniversityId_idx" ON "TransferPathway"("fromUniversityId");

-- CreateIndex
CREATE INDEX "TransferPathway_toUniversityId_idx" ON "TransferPathway"("toUniversityId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_createdAt_idx" ON "AnalyticsEvent"("eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_universityId_idx" ON "AnalyticsEvent"("universityId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_userId_idx" ON "AnalyticsEvent"("userId");

-- CreateIndex
CREATE INDEX "Lead_universityId_idx" ON "Lead"("universityId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeCustomerId_key" ON "Subscription"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "ScrapedUniversity_source_country_idx" ON "ScrapedUniversity"("source", "country");

-- CreateIndex
CREATE INDEX "ScrapedUniversity_normalizedName_idx" ON "ScrapedUniversity"("normalizedName");

-- CreateIndex
CREATE INDEX "ScrapedUniversity_status_idx" ON "ScrapedUniversity"("status");

-- CreateIndex
CREATE INDEX "ScrapedUniversity_qualityScore_idx" ON "ScrapedUniversity"("qualityScore");

-- CreateIndex
CREATE INDEX "IntakeSession_userId_idx" ON "IntakeSession"("userId");

-- CreateIndex
CREATE INDEX "IntakeSession_status_idx" ON "IntakeSession"("status");

-- CreateIndex
CREATE INDEX "IntakeMessage_sessionId_idx" ON "IntakeMessage"("sessionId");

-- CreateIndex
CREATE INDEX "AgentMatch_sessionId_idx" ON "AgentMatch"("sessionId");

-- CreateIndex
CREATE INDEX "AgentMatch_universityId_idx" ON "AgentMatch"("universityId");
