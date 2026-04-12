ALTER TABLE "public"."Scan" ADD COLUMN "auditMode" TEXT NOT NULL DEFAULT 'classic';

CREATE INDEX "Scan_auditMode_idx" ON "public"."Scan"("auditMode");
