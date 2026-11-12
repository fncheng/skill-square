-- 无版本资源无法推导共同资料，要求先处理异常数据。
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "skills" s WHERE NOT EXISTS (SELECT 1 FROM "skill_versions" v WHERE v."skillId" = s.id)) THEN
    RAISE EXCEPTION 'Cannot migrate SKILL without versions';
  END IF;
END $$;
ALTER TABLE "skills" ADD COLUMN "name" VARCHAR(200), ADD COLUMN "description" VARCHAR(500);
UPDATE "skills" s SET "name" = v.name, "description" = v.description
FROM (SELECT DISTINCT ON ("skillId") "skillId", name, description FROM "skill_versions" ORDER BY "skillId", number DESC) v
WHERE s.id = v."skillId";
ALTER TABLE "skills" ALTER COLUMN "name" SET NOT NULL, ALTER COLUMN "description" SET NOT NULL;
CREATE TABLE "skill_variants" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "skillId" UUID NOT NULL,
  "toolKey" VARCHAR(32) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "skill_variants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "skill_variants_skillId_toolKey_key" ON "skill_variants"("skillId", "toolKey");
CREATE UNIQUE INDEX "skill_variants_id_skillId_key" ON "skill_variants"("id", "skillId");
ALTER TABLE "skill_variants" ADD CONSTRAINT "skill_variants_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
INSERT INTO "skill_variants" ("skillId", "toolKey", "createdAt", "updatedAt") SELECT id, 'unspecified', "createdAt", "updatedAt" FROM "skills";
ALTER TABLE "skill_versions" ADD COLUMN "variantId" UUID, ADD COLUMN "requestFingerprint" VARCHAR(64);
UPDATE "skill_versions" v SET "variantId" = a.id FROM "skill_variants" a WHERE v."skillId" = a."skillId";
ALTER TABLE "skill_versions" ALTER COLUMN "variantId" SET NOT NULL;
DROP INDEX "skill_versions_skillId_number_key";
CREATE UNIQUE INDEX "skill_versions_variantId_number_key" ON "skill_versions"("variantId", "number");
ALTER TABLE "skill_versions" ADD CONSTRAINT "skill_versions_variantId_skillId_fkey" FOREIGN KEY ("variantId", "skillId") REFERENCES "skill_variants"("id", "skillId") ON DELETE CASCADE ON UPDATE CASCADE;
