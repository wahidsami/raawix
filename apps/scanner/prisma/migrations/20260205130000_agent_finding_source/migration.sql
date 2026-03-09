-- AlterTable: Add AgentFinding.source for clean filtering (agent vs openai)
ALTER TABLE "AgentFinding" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'agent';

-- Backfill: rows where evidenceJson contains source = 'openai'
UPDATE "AgentFinding" SET "source" = 'openai' WHERE ("evidenceJson"::jsonb->>'source') = 'openai';

-- CreateIndex
CREATE INDEX "AgentFinding_source_idx" ON "AgentFinding"("source");
