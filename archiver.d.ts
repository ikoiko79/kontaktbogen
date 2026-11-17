declare module 'archiver' {
  import { Transform } from 'node:stream';
  export class ZipArchive extends Transform {
    constructor(options?: { store?: boolean; zlib?: { level?: number } });
    file(path: string, data: { name: string }): this;
    finalize(): Promise<void>;
    abort(): this;
  }
}
