"use client";

import { useState } from "react";
import { FileList } from "@/components/files/file-list";
import { FileUploadZone } from "@/components/files/file-upload-zone";

export default function FilesPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Files
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Upload project assets, classify documents, and keep file context close
          to customer work.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <FileUploadZone onUploaded={() => setRefreshKey((key) => key + 1)} />
        <FileList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
