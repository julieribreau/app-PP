import type { StoragePort } from "./storage.port";

/** Adaptateur en mémoire, pour les tests : même contrat que S3. */
export class MemoryStorageAdapter implements StoragePort {
  readonly objects = new Map<string, { body: Uint8Array; contentType: string }>();

  async put(key: string, body: Uint8Array, contentType: string) {
    this.objects.set(key, { body, contentType });
  }

  async get(key: string) {
    return this.objects.get(key) ?? null;
  }

  async delete(key: string) {
    this.objects.delete(key);
  }

  async signedUrl(key: string) {
    return `memory://${key}`;
  }

  async ping() {}
}
