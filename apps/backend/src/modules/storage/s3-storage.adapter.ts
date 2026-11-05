import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { StorageConfig } from "./storage.config";
import type { StoragePort } from "./storage.port";

export class S3StorageAdapter implements StoragePort {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.S3_ENDPOINT,
      region: config.S3_REGION,
      forcePathStyle: config.S3_FORCE_PATH_STYLE === "true",
      credentials: { accessKeyId: config.S3_ACCESS_KEY, secretAccessKey: config.S3_SECRET_KEY },
    });
  }

  async put(key: string, body: Uint8Array, contentType: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string) {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }),
      );
      if (!res.Body) return null;
      return {
        body: await res.Body.transformToByteArray(),
        contentType: res.ContentType ?? "application/octet-stream",
      };
    } catch (err) {
      if ((err as { name?: string }).name === "NoSuchKey") return null;
      throw err;
    }
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }));
  }

  signedUrl(key: string, expiresInSeconds = 3600) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.config.S3_BUCKET, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async ping() {
    await this.client.send(new HeadBucketCommand({ Bucket: this.config.S3_BUCKET }));
  }
}
