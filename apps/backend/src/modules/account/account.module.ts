import { Module } from "@nestjs/common";

import { CartModule } from "../cart/cart.module";
import { AccountController } from "./controllers/account.controller";
import { AccountRepository } from "./repositories/account.repository";
import { AccountService } from "./services/account.service";

@Module({
  imports: [CartModule],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
})
export class AccountModule {}
