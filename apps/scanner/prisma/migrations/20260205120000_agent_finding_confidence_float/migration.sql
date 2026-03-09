-- AlterTable: AgentFinding.confidence from TEXT to DOUBLE PRECISION (0..1)
-- Existing values: 'high'->0.9, 'medium'->0.6, 'low'->0.3; numeric strings preserved
ALTER TABLE "AgentFinding" ALTER COLUMN "confidence" TYPE DOUBLE PRECISION USING (
  CASE
    WHEN "confidence" ~ '^[0-9.]+$' THEN "confidence"::DOUBLE PRECISION
    WHEN "confidence" = 'high' THEN 0.9
    WHEN "confidence" = 'medium' THEN 0.6
    WHEN "confidence" = 'low' THEN 0.3
    ELSE 0.5
  END
);
