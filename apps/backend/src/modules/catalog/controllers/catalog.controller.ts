import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { type Locale, RequestLocale } from "../../../common/locale";
import { CatalogQueryDto } from "../dto/catalog.dto";
import { CatalogService } from "../services/catalog.service";

@ApiTags("Catalogue")
@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("categories")
  categories(@RequestLocale() locale: Locale) {
    return this.catalog.categories(locale);
  }

  @Get("products")
  products(@Query() q: CatalogQueryDto, @RequestLocale() locale: Locale) {
    return this.catalog.list(q, locale);
  }

  @Get("products/:slug")
  product(@Param("slug") slug: string, @RequestLocale() locale: Locale) {
    return this.catalog.detail(slug, locale);
  }
}
