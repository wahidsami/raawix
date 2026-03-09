-- CreateTable
CREATE TABLE "Scan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanId" TEXT NOT NULL,
    "seedUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "maxPages" INTEGER NOT NULL,
    "maxDepth" INTEGER NOT NULL,
    "hostname" TEXT NOT NULL,
    "summaryJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanId" UUID NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "finalUrl" TEXT,
    "canonicalUrl" TEXT,
    "pageFingerprintJson" JSONB,
    "screenshotPath" TEXT,
    "htmlPath" TEXT,
    "a11yPath" TEXT,
    "visionPath" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanId" UUID NOT NULL,
    "pageId" UUID,
    "ruleId" TEXT NOT NULL,
    "wcagId" TEXT,
    "level" TEXT,
    "status" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "message" TEXT,
    "evidenceJson" JSONB NOT NULL,
    "howToVerify" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisionFinding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanId" UUID NOT NULL,
    "pageId" UUID,
    "kind" TEXT NOT NULL,
    "bboxJson" JSONB NOT NULL,
    "detectedText" TEXT,
    "confidence" TEXT NOT NULL,
    "correlatedSelector" TEXT,
    "evidenceJson" JSONB NOT NULL,
    "suggestedWcagIdsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisionFinding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageVersion" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "siteId" UUID NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "finalUrl" TEXT,
    "fingerprintHash" TEXT NOT NULL,
    "scanId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssistiveMap" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pageVersionId" UUID NOT NULL,
    "json" JSONB NOT NULL,
    "confidenceSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistiveMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminUser" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "siteId" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WidgetEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetDailyAggregate" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "siteId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "uniqueSessions" INTEGER NOT NULL DEFAULT 0,
    "widgetOpens" INTEGER NOT NULL DEFAULT 0,
    "voiceEnabled" INTEGER NOT NULL DEFAULT 0,
    "commandUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetDailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Scan_scanId_key" ON "Scan"("scanId");

-- CreateIndex
CREATE INDEX "Scan_scanId_idx" ON "Scan"("scanId");

-- CreateIndex
CREATE INDEX "Scan_hostname_completedAt_idx" ON "Scan"("hostname", "completedAt");

-- CreateIndex
CREATE INDEX "Scan_status_idx" ON "Scan"("status");

-- CreateIndex
CREATE INDEX "Page_scanId_idx" ON "Page"("scanId");

-- CreateIndex
CREATE INDEX "Page_url_idx" ON "Page"("url");

-- CreateIndex
CREATE INDEX "Page_canonicalUrl_idx" ON "Page"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "Page_scanId_pageNumber_key" ON "Page"("scanId", "pageNumber");

-- CreateIndex
CREATE INDEX "Finding_scanId_idx" ON "Finding"("scanId");

-- CreateIndex
CREATE INDEX "Finding_pageId_idx" ON "Finding"("pageId");

-- CreateIndex
CREATE INDEX "Finding_ruleId_idx" ON "Finding"("ruleId");

-- CreateIndex
CREATE INDEX "Finding_wcagId_idx" ON "Finding"("wcagId");

-- CreateIndex
CREATE INDEX "Finding_status_idx" ON "Finding"("status");

-- CreateIndex
CREATE INDEX "VisionFinding_scanId_idx" ON "VisionFinding"("scanId");

-- CreateIndex
CREATE INDEX "VisionFinding_pageId_idx" ON "VisionFinding"("pageId");

-- CreateIndex
CREATE INDEX "VisionFinding_kind_idx" ON "VisionFinding"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Site_domain_key" ON "Site"("domain");

-- CreateIndex
CREATE INDEX "Site_domain_idx" ON "Site"("domain");

-- CreateIndex
CREATE INDEX "PageVersion_siteId_canonicalUrl_idx" ON "PageVersion"("siteId", "canonicalUrl");

-- CreateIndex
CREATE INDEX "PageVersion_canonicalUrl_idx" ON "PageVersion"("canonicalUrl");

-- CreateIndex
CREATE INDEX "PageVersion_fingerprintHash_idx" ON "PageVersion"("fingerprintHash");

-- CreateIndex
CREATE UNIQUE INDEX "PageVersion_siteId_canonicalUrl_fingerprintHash_key" ON "PageVersion"("siteId", "canonicalUrl", "fingerprintHash");

-- CreateIndex
CREATE UNIQUE INDEX "AssistiveMap_pageVersionId_key" ON "AssistiveMap"("pageVersionId");

-- CreateIndex
CREATE INDEX "AssistiveMap_pageVersionId_idx" ON "AssistiveMap"("pageVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "WidgetEvent_siteId_createdAt_idx" ON "WidgetEvent"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "WidgetEvent_eventType_idx" ON "WidgetEvent"("eventType");

-- CreateIndex
CREATE INDEX "WidgetEvent_createdAt_idx" ON "WidgetEvent"("createdAt");

-- CreateIndex
CREATE INDEX "WidgetDailyAggregate_siteId_date_idx" ON "WidgetDailyAggregate"("siteId", "date");

-- CreateIndex
CREATE INDEX "WidgetDailyAggregate_date_idx" ON "WidgetDailyAggregate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetDailyAggregate_siteId_date_key" ON "WidgetDailyAggregate"("siteId", "date");

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionFinding" ADD CONSTRAINT "VisionFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisionFinding" ADD CONSTRAINT "VisionFinding_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageVersion" ADD CONSTRAINT "PageVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssistiveMap" ADD CONSTRAINT "AssistiveMap_pageVersionId_fkey" FOREIGN KEY ("pageVersionId") REFERENCES "PageVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetEvent" ADD CONSTRAINT "WidgetEvent_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WidgetDailyAggregate" ADD CONSTRAINT "WidgetDailyAggregate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
