-- AlterTable
ALTER TABLE "Page" ADD COLUMN "agentPath" TEXT;

-- CreateTable
CREATE TABLE "AgentFinding" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "scanId" UUID NOT NULL,
    "pageId" UUID,
    "kind" TEXT NOT NULL,
    "message" TEXT,
    "confidence" TEXT NOT NULL,
    "evidenceJson" JSONB NOT NULL,
    "howToVerify" TEXT,
    "suggestedWcagIdsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentFinding_scanId_idx" ON "AgentFinding"("scanId");

-- CreateIndex
CREATE INDEX "AgentFinding_pageId_idx" ON "AgentFinding"("pageId");

-- CreateIndex
CREATE INDEX "AgentFinding_kind_idx" ON "AgentFinding"("kind");

-- AddForeignKey
ALTER TABLE "AgentFinding" ADD CONSTRAINT "AgentFinding_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "Scan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentFinding" ADD CONSTRAINT "AgentFinding_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
