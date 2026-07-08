CREATE TYPE "MidstateImportStatus" AS ENUM ('uploaded', 'imported', 'failed');

CREATE TABLE "MidstateImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sheetName" TEXT,
    "status" "MidstateImportStatus" NOT NULL DEFAULT 'uploaded',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "vendorNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MidstateImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MidstateSellThroughRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "postDate" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "vendorNumber" TEXT,
    "memberNumber" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "msItemNumber" TEXT,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "orderClass" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4),
    "costExt" DECIMAL(18,4),
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MidstateSellThroughRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MidstateImport_createdAt_idx" ON "MidstateImport"("createdAt");
CREATE INDEX "MidstateImport_status_idx" ON "MidstateImport"("status");
CREATE INDEX "MidstateImport_periodYear_periodMonth_idx" ON "MidstateImport"("periodYear", "periodMonth");
CREATE INDEX "MidstateImport_vendorNumber_idx" ON "MidstateImport"("vendorNumber");
CREATE INDEX "MidstateSellThroughRecord_importId_idx" ON "MidstateSellThroughRecord"("importId");
CREATE INDEX "MidstateSellThroughRecord_postDate_idx" ON "MidstateSellThroughRecord"("postDate");
CREATE INDEX "MidstateSellThroughRecord_memberNumber_idx" ON "MidstateSellThroughRecord"("memberNumber");
CREATE INDEX "MidstateSellThroughRecord_memberName_idx" ON "MidstateSellThroughRecord"("memberName");
CREATE INDEX "MidstateSellThroughRecord_sku_idx" ON "MidstateSellThroughRecord"("sku");
CREATE INDEX "MidstateSellThroughRecord_orderClass_idx" ON "MidstateSellThroughRecord"("orderClass");
CREATE INDEX "MidstateSellThroughRecord_category_idx" ON "MidstateSellThroughRecord"("category");

ALTER TABLE "MidstateSellThroughRecord"
ADD CONSTRAINT "MidstateSellThroughRecord_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "MidstateImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
