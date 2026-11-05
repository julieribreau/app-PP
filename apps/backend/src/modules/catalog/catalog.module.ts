import { Module } from "@nestjs/common";

import { AdminCatalogController } from "./controllers/admin-catalog.controller";
import { CatalogController } from "./controllers/catalog.controller";
import { CatalogRepository } from "./repositories/catalog.repository";
import { AdminCatalogService } from "./services/admin-catalog.service";
import { AdminCategoriesService } from "./services/admin-categories.service";
import { CatalogService } from "./services/catalog.service";

@Module({
  controllers: [CatalogController, AdminCatalogController],
  providers: [CatalogRepository, CatalogService, AdminCatalogService, AdminCategoriesService],
  exports: [CatalogRepository, CatalogService],
})
export class CatalogModule {}
