CREATE TABLE "skills" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "skill_versions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "skillId" UUID NOT NULL,
  "number" INTEGER NOT NULL, "name" VARCHAR(200) NOT NULL,
  "description" VARCHAR(500) NOT NULL, "note" VARCHAR(500) NOT NULL,
  "format" VARCHAR(8) NOT NULL, "originalName" VARCHAR(255) NOT NULL,
  "contentHash" VARCHAR(64) NOT NULL, "artifactHash" VARCHAR(64) NOT NULL,
  "artifact" BYTEA NOT NULL, "requestId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "skill_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_versions_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "skill_versions_skillId_number_key" ON "skill_versions"("skillId", "number");
CREATE UNIQUE INDEX "skill_versions_requestId_key" ON "skill_versions"("requestId");
CREATE UNIQUE INDEX "skill_versions_skillId_requestId_key" ON "skill_versions"("skillId", "requestId");
CREATE TABLE "skill_files" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "versionId" UUID NOT NULL,
  "path" TEXT NOT NULL, "size" INTEGER NOT NULL, "hash" VARCHAR(64) NOT NULL, "text" TEXT,
  CONSTRAINT "skill_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "skill_files_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "skill_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "skill_files_versionId_path_key" ON "skill_files"("versionId", "path");
