import { ZodError } from "zod";
import {
  getContentLengthUploadError,
  getMaxUploadBytes,
  isUploadOverLimit,
} from "@/lib/storage";
import {
  createMidstateImportFromFile,
  listMidstateImports,
} from "@/services/midstate/imports";

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

function isUploadValidationError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    ([
      "Upload a Midstate Excel workbook.",
      "File could not be read as a Midstate Excel workbook.",
      "Midstate workbook must include a RAW DATA sheet.",
    ].includes(error.message) ||
      error.message.startsWith(
        "Midstate RAW DATA is missing required columns:",
      ))
  );
}

export async function GET() {
  try {
    return Response.json({ imports: await listMidstateImports() });
  } catch (error) {
    console.error("Failed to list Midstate imports", error);
    return errorResponse("Unable to load Midstate imports.", 503);
  }
}

export async function POST(request: Request) {
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
      return errorResponse("A Midstate file is required.", 400);
    }

    if (isUploadOverLimit(file.size)) {
      return payloadTooLargeResponse();
    }

    return Response.json(
      { import: await createMidstateImportFromFile(file) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(
        "Midstate import input is invalid.",
        400,
        error.flatten(),
      );
    }
    if (
      error instanceof TypeError &&
      error.message.toLowerCase().includes("form")
    ) {
      return errorResponse("Request must be multipart form data.", 400);
    }

    if (isUploadValidationError(error)) {
      return errorResponse(error.message, 400);
    }

    if (isStorageError(error)) {
      const status = storageStatus(error);
      console.error("Failed to save Midstate upload", error);
      return errorResponse("Unable to store uploaded file.", status);
    }

    console.error("Failed to create Midstate import", error);
    return errorResponse(
      "Unable to save Midstate import. Check database configuration.",
      503,
    );
  }
}
