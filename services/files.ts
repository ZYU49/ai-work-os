import { FileCategory, Prisma } from "@prisma/client";
import { z } from "zod";
import { recordActivity } from "@/lib/activity";
import { prisma } from "@/lib/db";

const fileCategoryValues = Object.values(FileCategory) as [
  FileCategory,
  ...FileCategory[],
];

export const fileCategorySchema = z.enum(fileCategoryValues);

export const fileFiltersSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  category: fileCategorySchema.optional(),
  status: z.string().trim().min(1).optional(),
  query: z.string().trim().min(1).optional(),
});

export const createFileAssetSchema = z.object({
  projectId: z.string().trim().min(1).optional(),
  filename: z.string().trim().min(1, "File name is required"),
  url: z.string().trim().min(1, "File URL is required"),
  mimeType: z.string().trim().min(1).optional(),
  size: z.number().int().nonnegative().optional(),
  category: fileCategorySchema.default(FileCategory.other),
  summary: z.string().trim().min(1).optional(),
  originalName: z.string().trim().min(1).optional(),
  storagePath: z.string().trim().min(1).optional(),
  notes: z.string().trim().min(1).optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  status: z.string().trim().min(1).optional(),
});

export type FileFilters = z.infer<typeof fileFiltersSchema>;
export type CreateFileAssetInput = z.infer<typeof createFileAssetSchema>;

const fileListInclude = {
  project: true,
} satisfies Prisma.FileAssetInclude;

function createMetadata(input: CreateFileAssetInput): Prisma.InputJsonObject {
  return {
    ...(input.originalName !== undefined
      ? { originalName: input.originalName }
      : {}),
    ...(input.storagePath !== undefined
      ? { storagePath: input.storagePath }
      : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.tags.length > 0 ? { tags: input.tags } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
}

function buildFileWhere(filters: FileFilters): Prisma.FileAssetWhereInput {
  const and: Prisma.FileAssetWhereInput[] = [];

  if (filters.projectId) {
    and.push({ projectId: filters.projectId });
  }

  if (filters.category) {
    and.push({ category: filters.category });
  }

  if (filters.status) {
    and.push({
      metadata: {
        path: ["status"],
        equals: filters.status,
      },
    });
  }

  if (filters.query) {
    and.push({
      OR: [
        { filename: { contains: filters.query, mode: "insensitive" } },
        { summary: { contains: filters.query, mode: "insensitive" } },
        {
          metadata: {
            path: ["originalName"],
            string_contains: filters.query,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  return and.length > 0 ? { AND: and } : {};
}

export async function listFiles(filters: FileFilters = {}) {
  const parsedFilters = fileFiltersSchema.parse(filters);

  return prisma.fileAsset.findMany({
    take: 100,
    where: buildFileWhere(parsedFilters),
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    include: fileListInclude,
  });
}

export async function createFileAsset(input: CreateFileAssetInput) {
  const parsedInput = createFileAssetSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const file = await tx.fileAsset.create({
      data: {
        projectId: parsedInput.projectId,
        filename: parsedInput.filename,
        url: parsedInput.url,
        mimeType: parsedInput.mimeType,
        size: parsedInput.size,
        category: parsedInput.category,
        summary: parsedInput.summary,
        metadata: createMetadata(parsedInput),
      },
      include: fileListInclude,
    });

    await recordActivity(
      {
        projectId: file.projectId ?? undefined,
        action: "file.created",
        entityType: "FileAsset",
        entityId: file.id,
        title: "File uploaded",
        description: file.filename,
        metadata: {
          category: file.category,
          mimeType: file.mimeType ?? null,
          size: file.size ?? null,
          originalName: parsedInput.originalName ?? null,
          tags: parsedInput.tags,
        },
      },
      tx,
    );

    return file;
  });
}
