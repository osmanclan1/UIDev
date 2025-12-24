declare module 'adm-zip' {
  export default class AdmZip {
    constructor(buffer?: Buffer | string)
    extractAllTo(targetPath: string, overwrite?: boolean): void
    addFile(filePath: string, data: Buffer): void
    toBuffer(): Buffer
  }
}

