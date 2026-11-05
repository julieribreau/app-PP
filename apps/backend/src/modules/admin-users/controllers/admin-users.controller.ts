import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import type { AuthSession } from "../../auth/auth.service";
import { AdminGuard } from "../../auth/guards/admin.guard";
import { CurrentSession } from "../../auth/guards/session.guard";
import {
  AdminUsersExportQueryDto,
  AdminUsersQueryDto,
  ChangeRoleDto,
  SuspendUserDto,
} from "../dto/admin-users.dto";
import { AdminUsersService } from "../services/admin-users.service";

const uuid = new ParseUUIDPipe();

@ApiTags("Back-office · Usagers")
@UseGuards(AdminGuard)
@Controller("admin/users")
export class AdminUsersController {
  constructor(private readonly users: AdminUsersService) {}

  @Get()
  list(@Query() q: AdminUsersQueryDto) {
    const { page, pageSize, ...filters } = q;
    return this.users.list(filters, page, pageSize);
  }

  // Avant `:id` : sinon « export » serait lu comme un identifiant.
  @Get("export")
  async export(
    @CurrentSession() s: AuthSession,
    @Query() q: AdminUsersExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.users.exportCsv(s.user.id, q);
    const date = new Date().toISOString().slice(0, 10);
    res
      .status(200)
      .type("text/csv; charset=utf-8")
      .setHeader("Content-Disposition", `attachment; filename="usagers-${date}.csv"`)
      .send(csv);
  }

  @Get(":id")
  get(@Param("id", uuid) id: string) {
    return this.users.get(id);
  }

  @Post(":id/suspend")
  @HttpCode(200)
  suspend(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.users.suspend(s.user.id, id, dto.reason);
  }

  @Post(":id/reactivate")
  @HttpCode(200)
  reactivate(@CurrentSession() s: AuthSession, @Param("id", uuid) id: string) {
    return this.users.reactivate(s.user.id, id);
  }

  @Patch(":id/role")
  role(
    @CurrentSession() s: AuthSession,
    @Param("id", uuid) id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.users.changeRole(s.user.id, id, dto.role);
  }
}
