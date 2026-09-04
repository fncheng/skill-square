-- CreateTable
CREATE TABLE "model_responses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500) NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "sourceProduct" VARCHAR(120) NOT NULL DEFAULT '',
  "modelName" VARCHAR(120) NOT NULL DEFAULT '',
  "originalPrompt" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "model_responses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "model_responses_title_idx" ON "model_responses"("title");
CREATE INDEX "model_responses_category_idx" ON "model_responses"("category");

-- AlterTable
ALTER TABLE "annotations" ADD COLUMN "modelResponseId" UUID;
ALTER TABLE "annotations" DROP CONSTRAINT "annotations_resource_check";
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_resource_check" CHECK (
  ("resourceType" = 'NOTE' AND "noteId" IS NOT NULL AND "solutionId" IS NULL AND "modelResponseId" IS NULL)
  OR
  ("resourceType" = 'SOLUTION' AND "solutionId" IS NOT NULL AND "noteId" IS NULL AND "modelResponseId" IS NULL)
  OR
  ("resourceType" = 'MODEL_RESPONSE' AND "modelResponseId" IS NOT NULL AND "noteId" IS NULL AND "solutionId" IS NULL)
);
CREATE INDEX "annotations_modelResponseId_idx" ON "annotations"("modelResponseId");
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_modelResponseId_fkey"
  FOREIGN KEY ("modelResponseId") REFERENCES "model_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
