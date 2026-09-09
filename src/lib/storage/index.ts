/**
 * Storage facade — re-exports the active provider based on STORAGE_PROVIDER
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
      // v0.17: @aws-sdk/client-s3 es dependencia formal;
      // se requiere bajo demanda para evitar cargar ~47 dependencias
      // en modo local al iniciar.
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
