/** Port du stockage objet : le code métier ne connaît pas S3 (architecture-reference §Port). */
export interface StoragePort {
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  delete(key: string): Promise<void>;
  /** URL signée de lecture, à durée limitée. */
  signedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Le seau répond : sonde de /health/ready. */
  ping(): Promise<void>;
}

export const STORAGE = Symbol("STORAGE");
