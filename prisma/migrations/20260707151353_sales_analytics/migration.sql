-- CreateEnum
CREATE TYPE "SalesImportStatus" AS ENUM ('uploaded', 'mapped', 'imported', 'failed');

-- CreateEnum
CREATE TYPE "SalesImportSourceType" AS ENUM ('excel', 'csv');

-- CreateTable
CREATE TABLE "SalesImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sourceType" "SalesImportSourceType" NOT NULL,
    "sheetName" TEXT,
    "status" "SalesImportStatus" NOT NULL DEFAULT 'uploaded',
    "mapping" JSONB,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "invoiceNumber" TEXT,
    "customerCode" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPo" TEXT,
    "sku" TEXT NOT NULL,
    "productName" TEXT,
    "category" TEXT,
    "salesperson" TEXT,
    "shipToState" TEXT,
    "shipToCity" TEXT,
    "warehouse" TEXT,
    "shipmentNumber" TEXT,
    "shipToCode" TEXT,
    "memberName" TEXT,
    "quantity" DECIMAL(18,4) NOT NULL,
    "revenue" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesImport_createdAt_idx" ON "SalesImport"("createdAt");

-- CreateIndex
CREATE INDEX "SalesImport_status_idx" ON "SalesImport"("status");

-- CreateIndex
CREATE INDEX "SalesRecord_orderDate_idx" ON "SalesRecord"("orderDate");

-- CreateIndex
CREATE INDEX "SalesRecord_customerName_idx" ON "SalesRecord"("customerName");

-- CreateIndex
CREATE INDEX "SalesRecord_sku_idx" ON "SalesRecord"("sku");

-- CreateIndex
CREATE INDEX "SalesRecord_category_idx" ON "SalesRecord"("category");

-- CreateIndex
CREATE INDEX "SalesRecord_salesperson_idx" ON "SalesRecord"("salesperson");

-- CreateIndex
CREATE INDEX "SalesRecord_memberName_idx" ON "SalesRecord"("memberName");

-- CreateIndex
CREATE INDEX "SalesRecord_shipToState_idx" ON "SalesRecord"("shipToState");

-- AddForeignKey
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SalesImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
