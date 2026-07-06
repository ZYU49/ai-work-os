import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import {
  deleteStoredFile,
  getContentLengthUploadError,
  getMaxUploadBytes,
  isUploadOverLimit,
  saveUploadedFile,
  type SavedUploadedFile,
} from "@/lib/storage";
import {
  createFileAsset,
  createFileAssetSchema,
  fileCategorySchema,
  fileFiltersSchema,
  listFiles,
} from "@/services/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function payloadTooLargeResponse() {
  return errorResponse(
    `File is too large. Maximum upload size is ${getMaxUploadBytes()} bytes.`,
    413,
  );
}

function lengthRequiredResponse() {
  return errorResponse(
    "Content-Length header is required for file uploads.",
    411,
  );
}

function stringValue(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function tagsFromForm(formData: FormData) {
  const values = [
    ...formData.getAll("tags"),
    ...formData.getAll("tag"),
  ].filter((value): value is string => typeof value === "string");

  return values
    .flatMap((value) => value.split(","))
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function isFileEntry(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

function storageStatus(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["EACCES", "EMFILE", "ENFILE", "ENOSPC", "EROFS"].includes(
      String(error.code),
    )
  ) {
    return 503;
  }

  return 500;
}

function isStorageError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    ["EACCES", "EMFILE", "ENFILE", "ENOSPC", "EROFS"].includes(
      String(error.code),
    )
  );
}

async function cleanupSavedFile(saved: SavedUploadedFile | null) {
  if (!saved) {
    return;
  }

  try {
    await deleteStoredFile(saved.storagePath);
  } catch (cleanupError) {
    console.error("Failed to clean up uploaded file after API error", cleanupError);
  }
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const files = await listFiles(
      fileFiltersSchema.parse({
        projectId: searchParams.get("projectId") ?? undefined,
        category: searchParams.get("category") ?? undefined,
        status: searchParams.get("status") ?? undefined,
        query:
          searchParams.get("query") ?? searchParams.get("q") ?? undefined,
      }),
    );

    return Response.json({ files });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("File filters are invalid.", 400, error.flatten());
    }

    console.error("Failed to list files", error);
    return errorResponse("Unable to load files. Check database configuration.", 503);
  }
}

export async function POST(request: Request) {
  let saved: SavedUploadedFile | null = null;

  try {
    const contentLengthError = getContentLengthUploadError(
      request.headers.get("content-length"),
    );

    if (contentLengthError === "length_required") {
      return lengthRequiredResponse();
    }

    if (contentLengthError === "too_large") {
      return payloadTooLargeResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!isFileEntry(file)) {
      return errorResponse("A file is required.", 400);
    }

    if (isUploadOverLimit(file.size)) {
      return payloadTooLargeResponse();
    }

    const category = fileCategorySchema.parse(
      stringValue(formData.get("category")) ?? "other",
    );
    saved = await saveUploadedFile(file);
    const input = createFileAssetSchema.parse({
      projectId: stringValue(formData.get("projectId")),
      filename: saved.fileName,
      url: saved.storagePath,
      mimeType: saved.mimeType,
      size: saved.size,
      category,
      originalName: saved.originalName,
      storagePath: saved.storagePath,
      notes: stringValue(formData.get("notes")),
      tags: tagsFromForm(formData),
      status: stringValue(formData.get("status")),
    });
    const fileAsset = await createFileAsset(input);

    return Response.json({ file: fileAsset }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      await cleanupSavedFile(saved);
      return errorResponse("File input is invalid.", 400, error.flatten());
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2025" || error.code === "P2003")
    ) {
      await cleanupSavedFile(saved);
      return errorResponse("Project not found.", 404);
    }

    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes("form")
    ) {
      return errorResponse("Request must be multipart form data.", 400);
    }

    if (isStorageError(error)) {
      const status = storageStatus(error);
      console.error("Failed to save uploaded file", error);
      return errorResponse("Unable to store uploaded file.", status);
    }

    await cleanupSavedFile(saved);
    console.error("Failed to create file asset", error);
    return errorResponse("Unable to save file. Check database configuration.", 503);
  }
}
