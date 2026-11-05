import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

import { AdminGuard } from "../../auth/guards/admin.guard";
import { AuditQueryDto } from "../dto/audit.dto";
import { AuditService } from "../services/audit.service";

@ApiTags("Back-office · Audit")
@UseGuards(AdminGuard)
@Controller("admin/audit")
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() q: AuditQueryDto) {
    const { page, pageSize, ...filters } = q;
    return this.audit.list(filters, page, pageSize);
  }
}
