import { Global, Module } from "@nestjs/common";

import { BrevoMailAdapter } from "./brevo.adapter";
import { loadMailConfig, usesBrevo } from "./mail.config";
import { MAIL } from "./mail.port";
import { SmtpMailAdapter } from "./smtp.adapter";

export { MAIL, type MailPort } from "./mail.port";

@Global()
@Module({
  providers: [
    {
      provide: MAIL,
      useFactory: () => {
        const config = loadMailConfig();
        return usesBrevo(config) ? new BrevoMailAdapter(config) : new SmtpMailAdapter(config);
      },
    },
  ],
  exports: [MAIL],
})
export class MailModule {}
