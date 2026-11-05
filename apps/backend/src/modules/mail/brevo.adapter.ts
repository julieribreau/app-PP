import type { MailConfig } from "./mail.config";
import type { MailMessage, MailPort } from "./mail.port";

/** Brevo (API transactionnelle v3), appelée en HTTP : pas de SDK à embarquer pour un envoi. */
export class BrevoMailAdapter implements MailPort {
  constructor(private readonly config: MailConfig) {}

  async send(message: MailMessage) {
    const from = /^(.*)<(.+)>$/.exec(this.config.MAIL_FROM);
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": this.config.BREVO_API_KEY ?? "", "content-type": "application/json" },
      body: JSON.stringify({
        sender: from
          ? { name: from[1]?.trim(), email: from[2]?.trim() }
          : { email: this.config.MAIL_FROM },
        to: [{ email: message.to }],
        subject: message.subject,
        htmlContent: message.html,
        textContent: message.text,
      }),
    });
    if (!res.ok) throw new Error(`Brevo a refusé l'envoi (HTTP ${res.status})`);
  }
}
