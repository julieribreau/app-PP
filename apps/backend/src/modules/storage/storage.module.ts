import { Global, Module } from "@nestjs/common";

import { S3StorageAdapter } from "./s3-storage.adapter";
import { loadStorageConfig } from "./storage.config";
import { STORAGE } from "./storage.port";

export { STORAGE, type StoragePort } from "./storage.port";

@Global()
@Module({
  providers: [{ provide: STORAGE, useFactory: () => new S3StorageAdapter(loadStorageConfig()) }],
  exports: [STORAGE],
})
export class StorageModule {}
