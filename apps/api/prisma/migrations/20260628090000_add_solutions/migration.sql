-- CreateTable
CREATE TABLE "solutions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(200) NOT NULL,
  "summary" VARCHAR(500) NOT NULL DEFAULT '',
  "content" TEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "solutions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "solutions_title_idx" ON "solutions"("title");
CREATE INDEX "solutions_category_idx" ON "solutions"("category");
