import { createWriteStream } from "fs";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";

export interface FileResponseLike {
    data: Blob;
}

export async function saveFileResponseToDisk(file: FileResponseLike, filename: string): Promise<void> {
    const webStream = file.data.stream() as unknown as NodeWebReadableStream<Uint8Array>;
    const source = Readable.fromWeb(webStream);
    await pipeline(source, createWriteStream(filename));
}
