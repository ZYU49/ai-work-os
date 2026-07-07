import { readFile } from "node:fs/promises";
import type { Prisma } from "@prisma/client";
import { MidstateImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deleteStoredFile, saveUploadedFile } from "@/lib/storage";
import {
  extractMidstatePreview,
  normalizeMidstateRow,
  rowsFromMidstateWorkbook,
  type MidstateWorkbookPreview,
  type NormalizedMidstateRecord,
} from "@/services/midstate/parser";

export const midstateCommitSchema = z.object({
  replaceExisting: z.boolean().optional().default(false),
});

export type MidstateImportPreview = MidstateWorkbookPreview & {
  importId: string;
  fileName: string;
};

export type MidstateImportSummary = {
  importId: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  replacedImports: number;
  errors: string[];
};

export type MidstateImportListItem = Awaited<
  ReturnType<typeof prisma.midstateImport.findMany>
>[number];

const MIDSTATE_IMPORT_BATCH_SIZE = 1_000;
const MIDSTATE_IMPORT_TRANSACTION_TIMEOUT_MS = 120_000;
const MIDSTATE_IMPORT_TRANSACTION_MAX_WAIT_MS = 10_000;
const EXISTING_PERIOD_ERROR =
  "Midstate period already exists. Confirm replacement to continue.";

async function cleanupSavedUpload(storagePath: string) {
  try {
    await deleteStoredFile(storagePath);
  } catch (cleanupError) {
    console.error(
      "Failed to clean up midstate upload after create error",
      cleanupError,
    );
  }
}

function validateFileName(fileName: string) {
  if (!/\.(xlsx|xls)$/i.test(fileName)) {
    throw new Error("Upload a Midstate Excel workbook.");
  }
}

function existingPeriodWhere(importRecord: {
  id: string;
  periodYear: number | null;
  periodMonth: number | null;
  vendorNumber: string | null;
}) {
  return {
    periodYear: importRecord.periodYear,
    periodMonth: importRecord.periodMonth,
    vendorNumber: importRecord.vendorNumber,
    status: MidstateImportStatus.imported,
    NOT: { id: importRecord.id },
  };
}

function rejectedRowMessage(rowIndex: number, errors: string[]) {
  return `Row ${rowIndex}: ${errors.join(" ")}`;
}

export async function createMidstateImportFromFile(
  file: File,
): Promise<MidstateImportPreview> {
  validateFileName(file.name);

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = extractMidstatePreview({ buffer, fileName: file.name });
  const saved = await saveUploadedFile(file);
  let midstateImport;

  try {
    midstateImport = await prisma.midstateImport.create({
      data: {
        fileName: saved.originalName,
        storagePath: saved.storagePath,
        sheetName: preview.sheetName,
        totalRows: preview.totalRows,
        periodYear: preview.periodYear,
        periodMonth: preview.periodMonth,
        vendorNumber: preview.vendorNumber,
      },
    });
  } catch (error) {
    await cleanupSavedUpload(saved.storagePath);
    throw error;
  }

  return {
    ...preview,
    importId: midstateImport.id,
    fileName: midstateImport.fileName,
  };
}

export async function listMidstateImports(): Promise<MidstateImportListItem[]> {
  return prisma.midstateImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function commitMidstateImport(
  importId: string,
  options?: { replaceExisting?: boolean },
): Promise<MidstateImportSummary> {
  const { replaceExisting } = midstateCommitSchema.parse(options ?? {});
  const midstateImport = await prisma.midstateImport.findUnique({
    where: { id: importId },
  });

  if (!midstateImport) {
    throw new Error("Midstate import not found.");
  }

  const existingImports = await prisma.midstateImport.findMany({
    where: existingPeriodWhere(midstateImport),
    select: { id: true },
  });

  if (existingImports.length > 0 && !replaceExisting) {
    throw new Error(EXISTING_PERIOD_ERROR);
  }

  const rows = rowsFromMidstateWorkbook(
    await readFile(midstateImport.storagePath),
    midstateImport.sheetName ?? undefined,
  );
  const records: Array<{ importId: string } & NormalizedMidstateRecord> = [];
  const errors: string[] = [];
  let rejectedRows = 0;

  rows.forEach((row, index) => {
    const normalized = normalizeMidstateRow(row);
    if (!normalized.ok) {
      rejectedRows += 1;
      errors.push(rejectedRowMessage(index + 2, normalized.errors));
      return;
    }
    records.push({
      importId,
      ...normalized.record,
    });
  });

  await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      if (replaceExisting && existingImports.length > 0) {
        await tx.midstateImport.deleteMany({
          where: { id: { in: existingImports.map((item) => item.id) } },
        });
      }

      await tx.midstateSellThroughRecord.deleteMany({ where: { importId } });

      for (
        let index = 0;
        index < records.length;
        index += MIDSTATE_IMPORT_BATCH_SIZE
      ) {
        await tx.midstateSellThroughRecord.createMany({
          data: records.slice(index, index + MIDSTATE_IMPORT_BATCH_SIZE),
        });
      }

      await tx.midstateImport.update({
        where: { id: importId },
        data: {
          status: MidstateImportStatus.imported,
          totalRows: rows.length,
          importedRows: records.length,
          rejectedRows,
          errorMessage: errors.length > 0 ? errors.slice(0, 10).join("\n") : null,
        },
      });
    },
    {
      timeout: MIDSTATE_IMPORT_TRANSACTION_TIMEOUT_MS,
      maxWait: MIDSTATE_IMPORT_TRANSACTION_MAX_WAIT_MS,
    },
  );

  return {
    importId,
    totalRows: rows.length,
    importedRows: records.length,
    rejectedRows,
    replacedImports: existingImports.length,
    errors,
  };
}
