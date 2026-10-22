-- CreateTable
CREATE TABLE "markdown_image_policies" (
  "id" VARCHAR(32) NOT NULL,
  "allowedHosts" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "version" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "markdown_image_policies_pkey" PRIMARY KEY ("id")
);
