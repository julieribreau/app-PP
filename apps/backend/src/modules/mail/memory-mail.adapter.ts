import type { MailMessage, MailPort } from "./mail.port";

/** Adaptateur des tests : garde les messages en mémoire pour en lire les liens. */
export class MemoryMailAdapter implements MailPort {
  readonly sent: MailMessage[] = [];

  async send(message: MailMessage) {
    this.sent.push(message);
  }

  /** Le dernier lien envoyé à une adresse, ou undefined. */
  lastLinkTo(email: string): string | undefined {
    const message = [...this.sent].reverse().find((m) => m.to === email);
    return message?.text.match(/https?:\/\/\S+/)?.[0];
  }
}
