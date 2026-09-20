-- CreateTable
CREATE TABLE "miscellanies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500) NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "miscellanies_pkey" PRIMARY KEY ("id")
);

-- AlterEnum
ALTER TYPE "AnnotationResourceType" ADD VALUE 'MISCELLANY' BEFORE 'MODEL_RESPONSE';

-- AlterTable
ALTER TABLE "annotations" ADD COLUMN "miscellanyId" UUID;

-- CreateIndex
CREATE INDEX "miscellanies_title_idx" ON "miscellanies"("title");
CREATE INDEX "miscellanies_category_idx" ON "miscellanies"("category");
CREATE INDEX "annotations_miscellanyId_idx" ON "annotations"("miscellanyId");

-- AddForeignKey
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_miscellanyId_fkey"
  FOREIGN KEY ("miscellanyId") REFERENCES "miscellanies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
