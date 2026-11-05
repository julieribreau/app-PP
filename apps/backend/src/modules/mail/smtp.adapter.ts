import { createTransport, type Transporter } from "nodemailer";

import type { MailConfig } from "./mail.config";
import type { MailMessage, MailPort } from "./mail.port";

/** SMTP sans authentification : Mailpit en dev (http://localhost:8025 pour lire). */
export class SmtpMailAdapter implements MailPort {
  private readonly transport: Transporter;

  constructor(private readonly config: MailConfig) {
    this.transport = createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: false,
    });
  }

  async send(message: MailMessage) {
    await this.transport.sendMail({ from: this.config.MAIL_FROM, ...message });
  }
}
