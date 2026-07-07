import { readFile } from "node:fs/promises";
import { SalesImportSourceType, SalesImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deleteStoredFile, saveUploadedFile } from "@/lib/storage";
import {
  salesFieldDefinitions,
  validateSalesMapping,
  type SalesFieldKey,
  type SalesFieldMapping,
} from "@/services/analytics/fields";
import {
  type NormalizedSalesRecord,
  extractWorkbookPreview,
  normalizeSalesRow,
  rowsFromWorkbook,
} from "@/services/analytics/parser";

export type SalesImportPreview = {
  importId: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
};

export type SalesImportSummary = {
  importId: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  errors: string[];
};

export type SalesImportListItem = Awaited<
  ReturnType<typeof prisma.salesImport.findMany>
>[number];

const SALES_IMPORT_BATCH_SIZE = 1_000;

export const salesMappingSchema = z
  .object(
    Object.fromEntries(
      Object.keys(salesFieldDefinitions).map((field) => [
        field,
        z.string().trim().optional(),
      ]),
    ) as Record<SalesFieldKey, z.ZodOptional<z.ZodString>>,
  )
  .partial();

function sourceTypeFromFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".csv")
    ? SalesImportSourceType.csv
    : SalesImportSourceType.excel;
}

async function cleanupSavedUpload(storagePath: string) {
  try {
    await deleteStoredFile(storagePath);
  } catch (cleanupError) {
    console.error("Failed to clean up sales upload after create error", cleanupError);
  }
}

export async function createSalesImportFromFile(
  file: File,
): Promise<SalesImportPreview> {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error("Upload an Excel or CSV file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = extractWorkbookPreview({
    buffer,
    fileName: file.name,
    mimeType: file.type,
  });
  const saved = await saveUploadedFile(file);
  let salesImport;

  try {
    salesImport = await prisma.salesImport.create({
      data: {
        fileName: saved.originalName,
        storagePath: saved.storagePath,
        sourceType: sourceTypeFromFile(saved.originalName),
        sheetName: preview.sheetName,
        totalRows: preview.totalRows,
      },
    });
  } catch (error) {
    await cleanupSavedUpload(saved.storagePath);
    throw error;
  }

  return {
    importId: salesImport.id,
    fileName: salesImport.fileName,
    sheetName: preview.sheetName,
    headers: preview.headers,
    previewRows: preview.previewRows,
    totalRows: preview.totalRows,
  };
}

export async function listSalesImports(): Promise<SalesImportListItem[]> {
  return prisma.salesImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function commitSalesImport(
  importId: string,
  mapping: SalesFieldMapping,
): Promise<SalesImportSummary> {
  const mappingResult = validateSalesMapping(mapping);
  if (!mappingResult.ok) {
    return {
      importId,
      totalRows: 0,
      importedRows: 0,
      rejectedRows: 0,
      errors: mappingResult.errors,
    };
  }

  const salesImport = await prisma.salesImport.findUnique({
    where: { id: importId },
  });
  if (!salesImport) {
    throw new Error("Sales import not found.");
  }

  const rows = rowsFromWorkbook(
    await readFile(salesImport.storagePath),
    salesImport.sheetName ?? undefined,
  );
  const records: Array<{ importId: string } & NormalizedSalesRecord> = [];
  let rejectedRows = 0;

  for (const row of rows) {
    const normalized = normalizeSalesRow(row, mapping);
    if (!normalized.ok) {
      rejectedRows += 1;
      continue;
    }
    records.push({
      importId,
      ...normalized.record,
    });
  }

  await prisma.salesRecord.deleteMany({ where: { importId } });
  for (let index = 0; index < records.length; index += SALES_IMPORT_BATCH_SIZE) {
    await prisma.salesRecord.createMany({
      data: records.slice(index, index + SALES_IMPORT_BATCH_SIZE),
    });
  }
  await prisma.salesImport.update({
    where: { id: importId },
    data: {
      status: SalesImportStatus.imported,
      mapping,
      totalRows: rows.length,
      importedRows: records.length,
      rejectedRows,
      errorMessage: null,
    },
  });

  return {
    importId,
    totalRows: rows.length,
    importedRows: records.length,
    rejectedRows,
    errors: [],
  };
}
