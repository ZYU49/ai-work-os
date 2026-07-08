import { readStoredFile } from "@/lib/storage";
import { getFileAssetById } from "@/services/files";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FileDownloadRouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function metadataValue(metadata: unknown, key: string) {
  if (
    metadata &&
    typeof metadata === "object" &&
    !Array.isArray(metadata) &&
    key in metadata
  ) {
    const value = (metadata as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  }

  return undefined;
}

function contentDisposition(fileName: string) {
  const asciiName = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/"/g, "'");
  const encodedName = encodeURIComponent(fileName);

  return `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`;
}

function isMissingFileError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

function isForbiddenFileError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "EACCES"
  );
}

export async function GET(
  _request: Request,
  context: FileDownloadRouteContext,
) {
  const { id } = await context.params;
  const file = await getFileAssetById(id);

  if (!file) {
    return errorResponse("File not found.", 404);
  }

  const storagePath =
    metadataValue(file.metadata, "storagePath") ?? file.url;
  const originalName =
    metadataValue(file.metadata, "originalName") ?? file.filename;

  try {
    const bytes = await readStoredFile(storagePath);

    return new Response(new Uint8Array(bytes), {
      headers: {
        "content-disposition": contentDisposition(originalName),
        "content-length": String(bytes.byteLength),
        "content-type": file.mimeType ?? "application/octet-stream",
      },
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return errorResponse("Stored file is missing.", 404);
    }

    if (isForbiddenFileError(error)) {
      return errorResponse("Stored file cannot be opened.", 403);
    }

    console.error("Failed to open stored file", error);
    return errorResponse("Unable to open file.", 503);
  }
}
