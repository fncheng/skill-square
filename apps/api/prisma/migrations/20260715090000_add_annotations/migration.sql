-- CreateEnum
CREATE TYPE "AnnotationResourceType" AS ENUM ('NOTE', 'SOLUTION');

-- CreateTable
CREATE TABLE "annotations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "resourceType" "AnnotationResourceType" NOT NULL,
  "noteId" UUID,
  "solutionId" UUID,
  "content" TEXT NOT NULL,
  "exact" TEXT NOT NULL,
  "prefix" VARCHAR(500) NOT NULL DEFAULT '',
  "suffix" VARCHAR(500) NOT NULL DEFAULT '',
  "start" INTEGER NOT NULL,
  "end" INTEGER NOT NULL,
  "documentUpdatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "annotations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "annotations_anchor_range_check" CHECK ("start" >= 0 AND "end" >= "start"),
  CONSTRAINT "annotations_resource_check" CHECK (
    ("resourceType" = 'NOTE' AND "noteId" IS NOT NULL AND "solutionId" IS NULL)
    OR
    ("resourceType" = 'SOLUTION' AND "solutionId" IS NOT NULL AND "noteId" IS NULL)
  )
);

-- CreateIndex
CREATE INDEX "annotations_noteId_idx" ON "annotations"("noteId");
CREATE INDEX "annotations_solutionId_idx" ON "annotations"("solutionId");
CREATE INDEX "annotations_resourceType_createdAt_idx" ON "annotations"("resourceType", "createdAt");

-- AddForeignKey
ALTER TABLE "annotations"
  ADD CONSTRAINT "annotations_noteId_fkey"
  FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "annotations"
  ADD CONSTRAINT "annotations_solutionId_fkey"
  FOREIGN KEY ("solutionId") REFERENCES "solutions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
