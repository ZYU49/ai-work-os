declare module "msgreader" {
  export type MsgReaderFileData = {
    body?: string;
    bodyHTML?: string;
    subject?: string;
    error?: string;
  };

  export default class MsgReader {
    constructor(arrayBuffer: ArrayBuffer);
    getFileData(): MsgReaderFileData;
  }
}
