import { Global, Module } from "@nestjs/common";

import { AdminAuditController } from "./controllers/admin-audit.controller";
import { AuditRepository } from "./repositories/audit.repository";
import { AuditService } from "./services/audit.service";

@Global()
@Module({
  controllers: [AdminAuditController],
  providers: [AuditRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
