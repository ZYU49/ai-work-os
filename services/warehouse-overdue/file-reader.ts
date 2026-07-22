import MsgReader from "msgreader";

function htmlToText(html: string) {
  if (typeof document === "undefined") {
    return html;
  }

  const container = document.createElement("div");
  container.innerHTML = html;
  return container.textContent ?? "";
}

export async function readWarehouseOverdueFile(file: File) {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".msg")) {
    const reader = new MsgReader(await file.arrayBuffer());
    const data = reader.getFileData();

    if (data.error) {
      throw new Error(data.error);
    }

    const body = data.body ?? (data.bodyHTML ? htmlToText(data.bodyHTML) : "");
    if (!body.trim()) {
      throw new Error("No message body found in this .msg file.");
    }

    return body;
  }

  return file.text();
}
