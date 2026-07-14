-- CreateEnum
CREATE TYPE "KnowledgeCategory" AS ENUM ('general', 'customer', 'product', 'process', 'file_reference');

-- CreateTable
CREATE TABLE "KnowledgePage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "category" "KnowledgeCategory" NOT NULL DEFAULT 'general',
    "content" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgePage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgePage_projectId_idx" ON "KnowledgePage"("projectId");

-- CreateIndex
CREATE INDEX "KnowledgePage_category_idx" ON "KnowledgePage"("category");

-- CreateIndex
CREATE INDEX "KnowledgePage_updatedAt_idx" ON "KnowledgePage"("updatedAt");

-- AddForeignKey
ALTER TABLE "KnowledgePage" ADD CONSTRAINT "KnowledgePage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
