import { Module } from "@nestjs/common";

import { AdminUsersController } from "./controllers/admin-users.controller";
import { AdminUsersRepository } from "./repositories/admin-users.repository";
import { AdminUsersService } from "./services/admin-users.service";

@Module({
  controllers: [AdminUsersController],
  providers: [AdminUsersRepository, AdminUsersService],
})
export class AdminUsersModule {}
