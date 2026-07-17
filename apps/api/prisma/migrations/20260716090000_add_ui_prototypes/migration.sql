-- CreateTable
CREATE TABLE "ui_prototypes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title" VARCHAR(160) NOT NULL,
  "summary" VARCHAR(500) NOT NULL DEFAULT '',
  "html" TEXT NOT NULL,
  "category" VARCHAR(80) NOT NULL DEFAULT '',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "allowExternal" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ui_prototypes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ui_prototypes_title_idx" ON "ui_prototypes"("title");
CREATE INDEX "ui_prototypes_category_idx" ON "ui_prototypes"("category");
