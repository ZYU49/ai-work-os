import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve, sep } from "node:path";

export const DEFAULT_FILE_UPLOAD_MAX_BYTES = 25 * 1024 * 1024;

export type SavedUploadedFile = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
};

function uploadRoot() {
  return (
    process.env.FILE_STORAGE_ROOT ??
    join(/* turbopackIgnore: true */ process.cwd(), "storage", "uploads")
  );
}

function resolvedUploadRoot() {
  return uploadRoot();
}

function isInsideUploadRoot(storagePath: string) {
  const root = resolvedUploadRoot();
  const resolvedPath = resolve(storagePath);
  const rootWithSeparator = root.endsWith(sep) ? root : `${root}${sep}`;

  return resolvedPath === root || resolvedPath.startsWith(rootWithSeparator);
}

export function getMaxUploadBytes() {
  const configuredValue = Number(process.env.FILE_UPLOAD_MAX_BYTES);

  return Number.isFinite(configuredValue) && configuredValue > 0
    ? Math.floor(configuredValue)
    : DEFAULT_FILE_UPLOAD_MAX_BYTES;
}

export function isUploadOverLimit(size: number) {
  return size > getMaxUploadBytes();
}

export function getContentLengthUploadError(contentLength: string | null) {
  if (contentLength === null) {
    return "length_required";
  }

  const parsedContentLength = Number(contentLength);

  if (!Number.isFinite(parsedContentLength) || parsedContentLength <= 0) {
    return "length_required";
  }

  if (isUploadOverLimit(parsedContentLength)) {
    return "too_large";
  }

  return null;
}

function slugifyName(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "upload";
}

function safeExtension(originalName: string) {
  const extension = extname(basename(originalName.replaceAll("\\", "/")))
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");

  return extension.length > 1 ? extension : "";
}

function safeBaseName(originalName: string) {
  const fileBaseName = basename(originalName.replaceAll("\\", "/"));
  const extension = safeExtension(fileBaseName);
  const withoutExtension = extension
    ? fileBaseName.slice(0, -extension.length)
    : fileBaseName;

  return slugifyName(withoutExtension);
}

export async function saveUploadedFile(file: File): Promise<SavedUploadedFile> {
  const originalName = file.name || "upload";
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const directory = join(uploadRoot(), year, month);
  const extension = safeExtension(originalName);
  const fileName = `${safeBaseName(originalName)}-${randomUUID()}${extension}`;
  const storagePath = join(directory, fileName);

  await mkdir(directory, { recursive: true });
  await writeFile(storagePath, new Uint8Array(await file.arrayBuffer()));

  return {
    fileName,
    originalName,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    storagePath,
  };
}

export async function deleteStoredFile(storagePath: string) {
  if (!isInsideUploadRoot(storagePath)) {
    return false;
  }

  try {
    await unlink(storagePath);
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw error;
  }
}

export async function readStoredFile(storagePath: string) {
  if (!isInsideUploadRoot(storagePath)) {
    const error = new Error("Stored file path is outside the upload root.");
    Object.assign(error, { code: "EACCES" });
    throw error;
  }

  return readFile(/* turbopackIgnore: true */ storagePath);
}
