CREATE UNIQUE INDEX "MidstateImport_imported_period_vendor_unique"
ON "MidstateImport" ("periodYear", "periodMonth", "vendorNumber")
WHERE "status" = 'imported'
  AND "periodYear" IS NOT NULL
  AND "periodMonth" IS NOT NULL
  AND "vendorNumber" IS NOT NULL;
