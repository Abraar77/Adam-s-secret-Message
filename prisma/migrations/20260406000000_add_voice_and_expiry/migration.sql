-- CreateEnum: profile type
CREATE TYPE "ProfileType" AS ENUM ('DRAWING', 'VOICE');

-- CreateEnum: submission type
CREATE TYPE "SubmissionType" AS ENUM ('DRAWING', 'VOICE');

-- AlterTable "Profile": add type column
ALTER TABLE "Profile" ADD COLUMN "type" "ProfileType" NOT NULL DEFAULT 'DRAWING';

-- AlterTable "Submission": add new columns
--   imageUrl is made nullable so voice submissions don't need it
--   expiresAt gets a backfill default of 12 days for existing rows, then we drop the default
ALTER TABLE "Submission"
  ADD COLUMN "type"        "SubmissionType" NOT NULL DEFAULT 'DRAWING',
  ADD COLUMN "audioUrl"    TEXT,
  ADD COLUMN "audioPreset" TEXT,
  ADD COLUMN "expiresAt"   TIMESTAMP(3) NOT NULL DEFAULT (NOW() + INTERVAL '12 days');

ALTER TABLE "Submission" ALTER COLUMN "imageUrl" DROP NOT NULL;

-- Remove transient default (new rows must supply expiresAt explicitly in code)
ALTER TABLE "Submission" ALTER COLUMN "expiresAt" DROP DEFAULT;

-- CreateIndex for efficient expiry queries / cleanup
CREATE INDEX "Submission_expiresAt_idx" ON "Submission"("expiresAt");