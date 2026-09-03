/**
 * S3-compatible storage provider (v0.17 å®Œæ•´å®žçŽ°).
 *
 * å¯ç”¨æ–¹å¼ï¼šåœ¨ .env ConfiguraciÃ³n STORAGE_PROVIDER=s3ï¼Œå¹¶æä¾›ï¼š
 *   - AWS_REGIONï¼ˆå¿…å¡«ï¼Œä¾‹ ap-northeast-1ï¼‰
 *   - S3_BUCKETï¼ˆå¿…å¡«ï¼‰
 *   - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEYï¼ˆIAM key å¿…å¡«ï¼›æˆ–ç”¨å…¶ä»– AWS å‡­è¯æœºåˆ¶ï¼‰
 *   - S3_ENDPOINTï¼ˆå¯é€‰ï¼Œè‡ªå»º S3 å…¼å®¹å­˜å‚¨å¦‚ MinIO/R2ï¼‰
 *   - S3_FORCE_PATH_STYLEï¼ˆå¯é€‰ï¼Œtrue ç”¨ path-styleï¼›MinIO å¿…é¡» trueï¼‰
 *   - S3_KEY_PREFIXï¼ˆå¯é€‰ï¼Œæ‰€æœ‰å¯¹è±¡ key å‰åŠ æ­¤å‰ç¼€ï¼Œä¾¿äºŽå¤šçŽ¯å¢ƒå…±ç”¨åŒ bucketï¼‰
 */
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  type S3ClientConfig
} from "@aws-sdk/client-s3";
import type { StorageProvider } from "./provider";

function readBucket(): string {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) throw new Error("S3_BUCKET æœªé…ç½®");
  return bucket;
}

function readRegion(): string {
  const region = process.env.AWS_REGION;
  if (!region) throw new Error("AWS_REGION æœªé…ç½®");
  return region;
}

function readKeyPrefix(): string {
  const p = process.env.S3_KEY_PREFIX ?? "";
  if (!p) return "";
  return p.endsWith("/") ? p : `${p}/`;
}

function buildClient(): S3Client {
  const config: S3ClientConfig = {
    region: readRegion()
  };
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }
  if (process.env.S3_FORCE_PATH_STYLE === "true") {
    config.forcePathStyle = true;
  }
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    };
  }
  return new S3Client(config);
}

/**
 * AWS SDK æŠŠå¯¹è±¡ body å½“æˆ ReadableStream / SDK stream-like å¯¹è±¡Volverï¼›ç»Ÿä¸€å¸æˆ Bufferã€‚
 */
async function streamToBuffer(stream: unknown): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  if (Buffer.isBuffer(stream)) return stream;

  const maybeSdk = stream as {
    transformToByteArray?: () => Promise<Uint8Array>;
  };
  if (typeof maybeSdk.transformToByteArray === "function") {
    const arr = await maybeSdk.transformToByteArray();
    return Buffer.from(arr);
  }

  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const s = stream as NodeJS.ReadableStream;
    s.on("data", (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    );
    s.on("end", () => resolve(Buffer.concat(chunks)));
    s.on("error", reject);
  });
}

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private prefix: string;

  constructor() {
    this.client = buildClient();
    this.bucket = readBucket();
    this.prefix = readKeyPrefix();
  }

  /**
   * å¯¹è±¡ key ç»“æž„ï¼š<prefix>/<scope>/<yyyymm>/<uuid>.bin
   * y LocalStorageProvider ä¿æŒåŒæ ·çš„ layoutï¼Œä¾¿äºŽ local â†” s3 è¿ç§»ã€‚
   * æ•°æ®åº“é‡Œä»…å­˜ relPathï¼ˆä¸å« prefixï¼‰ï¼Œåˆ‡æ¢ prefix æ—¶æ— éœ€å›žå¡«ã€‚
   */
  async writeFile(scope: string, data: Buffer): Promise<string> {
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "_");
    const relPath = `${safeScope}/${yyyymm}/${randomUUID()}.bin`;
    const key = this.prefix + relPath;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: "application/octet-stream"
      })
    );

    return relPath;
  }

  async readFile(relPath: string): Promise<Buffer> {
    const key = this.prefix + relPath;
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key })
    );
    return streamToBuffer(res.Body);
  }

  async deleteFile(relPath: string): Promise<void> {
    const key = this.prefix + relPath;
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
      );
    } catch (err) {
      const code =
        (err as { name?: string }).name ?? (err as { Code?: string }).Code;
      if (code === "NoSuchKey" || code === "NotFound") return;
      throw err;
    }
  }
}

