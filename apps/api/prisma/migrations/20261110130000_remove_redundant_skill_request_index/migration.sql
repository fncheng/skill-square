-- requestId 已全局唯一，无需维护重复的复合唯一索引。
DROP INDEX "skill_versions_skillId_requestId_key";
