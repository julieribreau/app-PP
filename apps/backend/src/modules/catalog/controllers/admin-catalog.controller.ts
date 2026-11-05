import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiConsumes, ApiTags } from "@nestjs/swagger";

import type { UploadedImage } from "../../../common/upload";
import { type Locale, RequestLocale } from "../../../common/locale";
import type { AuthSession } from "../../auth/auth.service";
import { AdminGuard } from "../../auth/guards/admin.guard";
import { CurrentSession } from "../../auth/guards/session.guard";
import {
  AdminProductsQueryDto,
  CreateCategoryDto,
  CreateProductDto,
  PatchVariantsDto,
  PutOptionsDto,
  UpdateCategoryDto,
  UpdateProductDto,
} from "../dto/admin-catalog.dto";
import { AdminCatalogService, MAX_IMAGE_BYTES } from "../services/admin-catalog.service";
import { AdminCategoriesService } from "../services/admin-categories.service";

const uuid = new ParseUUIDPipe();

@ApiTags("Back-office · Catalogue")
@UseGuards(AdminGuard)
@Controller("admin")
export class AdminCatalogController {
  constructor(
    private readonly catalog: AdminCatalogService,
    private readonly categoriesService: AdminCategoriesService,
  ) {}

  @Get("categories")
  categories() {
    return this.categoriesService.categories();
  }

  @Post("categories")
  createCategory(@CurrentSession() s: AuthSession, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.createCategory(s.user.id, dto);
  }

  @Patch("categories/:id")
  updateCategory(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.updateCategory(s.user.id, id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(204)
  deleteCategory(@CurrentSession() s: AuthSession, @Param("id", uuid) id: string) {
    return this.categoriesService.deleteCategory(s.user.id, id);
  }

  @Get("products")
  products(@Query() q: AdminProductsQueryDto, @RequestLocale() locale: Locale) {
    return this.catalog.list(q, locale);
  }

  @Post("products")
  create(@CurrentSession() s: AuthSession, @Body() dto: CreateProductDto) {
    return this.catalog.create(s.user.id, dto);
  }

  @Get("products/:id")
  get(@Param("id", uuid) id: string) {
    return this.catalog.get(id);
  }

  @Patch("products/:id")
  update(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.catalog.update(s.user.id, id, dto);
  }

  @Put("products/:id/image")
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_IMAGE_BYTES } }))
  setImage(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @UploadedFile() file?: UploadedImage,
  ) {
    return this.catalog.setImage(s.user.id, id, file);
  }

  @Delete("products/:id/image")
  @HttpCode(204)
  removeImage(@CurrentSession() s: AuthSession, @Param("id", uuid) id: string) {
    return this.catalog.removeImage(s.user.id, id);
  }

  @Put("products/:id/options")
  putOptions(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: PutOptionsDto,
  ) {
    return this.catalog.putOptions(s.user.id, id, dto);
  }

  @Patch("products/:id/variants")
  patchVariants(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: PatchVariantsDto,
  ) {
    return this.catalog.patchVariants(s.user.id, id, dto);
  }

  @Post("products/:id/archive")
  archive(@CurrentSession() s: AuthSession, @Param("id", uuid) id: string) {
    return this.catalog.archive(s.user.id, id);
  }

  @Delete("products/:id")
  @HttpCode(204)
  remove(@CurrentSession() s: AuthSession, @Param("id", uuid) id: string) {
    return this.catalog.remove(s.user.id, id);
  }
}
