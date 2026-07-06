import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import {
  deleteStoredFile,
  getContentLengthUploadError,
  getMaxUploadBytes,
  isUploadOverLimit,
  saveUploadedFile,
} from "../lib/storage";

const tempRoots: string[] = [];

async function makeTempRoot() {
  const root = await mkdtemp(join(tmpdir(), "ai-work-os-storage-"));
  tempRoots.push(root);
  process.env.FILE_STORAGE_ROOT = root;
  return root;
}

describe("saveUploadedFile", () => {
  afterEach(async () => {
    delete process.env.FILE_STORAGE_ROOT;
    await Promise.all(
      tempRoots.splice(0).map((root) =>
        rm(root, {
          force: true,
          recursive: true,
        }),
      ),
    );
  });

  it("stores uploads in year and month folders with a safe unique file name", async () => {
    const root = await makeTempRoot();
    const file = new File(["hello"], "..\\..\\Quarterly Quote Final.PDF", {
      type: "application/pdf",
    });

    const saved = await saveUploadedFile(file);
    const relativePath = relative(root, saved.storagePath);

    expect(saved.originalName).toBe("..\\..\\Quarterly Quote Final.PDF");
    expect(saved.mimeType).toBe("application/pdf");
    expect(saved.size).toBe(5);
    expect(relativePath.split(sep)).toHaveLength(3);
    expect(saved.fileName).toMatch(/quarterly-quote-final-[a-f0-9-]+\.pdf$/);
    expect(relativePath).not.toContain("..");
    expect(relativePath).not.toContain("\\..");
  });

  it("uses an env-configured max upload size and detects oversized uploads", () => {
    process.env.FILE_UPLOAD_MAX_BYTES = "12";

    expect(getMaxUploadBytes()).toBe(12);
    expect(isUploadOverLimit(12)).toBe(false);
    expect(isUploadOverLimit(13)).toBe(true);
    expect(getContentLengthUploadError(null)).toBe("length_required");
    expect(getContentLengthUploadError("abc")).toBe("length_required");
    expect(getContentLengthUploadError("0")).toBe("length_required");
    expect(getContentLengthUploadError("12")).toBeNull();
    expect(getContentLengthUploadError("13")).toBe("too_large");

    delete process.env.FILE_UPLOAD_MAX_BYTES;
  });

  it("deletes stored files only from inside the configured upload root", async () => {
    const root = await makeTempRoot();
    const insidePath = join(root, "2026", "07", "quote.txt");
    const outsideRoot = await mkdtemp(join(tmpdir(), "ai-work-os-outside-"));
    const outsidePath = join(outsideRoot, "quote.txt");
    tempRoots.push(outsideRoot);

    await mkdir(join(root, "2026", "07"), { recursive: true });
    await writeFile(insidePath, "inside");
    await writeFile(outsidePath, "outside");

    await deleteStoredFile(insidePath);
    await deleteStoredFile(outsidePath);

    await expect(readFile(insidePath)).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(readFile(outsidePath, "utf8")).resolves.toBe("outside");
  });
});
