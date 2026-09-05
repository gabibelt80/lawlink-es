/**
 * Storage facade â€” re-exports the active provider based on STORAGE_PROVIDER
 * env var (default: "local").
 *
 * Usage:
 *   import { storage } from "@/lib/storage";
 *   const path = await storage.writeFile("m_abc", buf);
 */
import type { StorageProvider } from "./provider";
import { LocalStorageProvider } from "./local";

export type { StorageProvider } from "./provider";

let _instance: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_instance) return _instance;

  const provider = process.env.STORAGE_PROVIDER ?? "local";

  switch (provider) {
    case "local": {
      _instance = new LocalStorageProvider();
      return _instance;
    }
    case "s3": {
      // v0.17: @aws-sdk/client-s3 å·²ä¸ºæ­£å¼ä¾èµ–ï¼›æŒ‰éœ€ require é¿å… local æ¨¡å¼
      // åœ¨å¯åŠ¨æ—¶Cargarå®ƒçš„ ~47 ä¸ªä¼ é€’ä¾èµ–ã€‚
      const { S3StorageProvider } = require("./s3") as typeof import("./s3");
      _instance = new S3StorageProvider();
      return _instance;
    }
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
  }
}

/** Singleton storage provider for the configured backend. */
export const storage: StorageProvider = getStorageProvider();

