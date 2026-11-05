/** Port d'envoi d'e-mails transactionnels : le code métier ne connaît ni SMTP ni Brevo. */
export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailPort {
  send(message: MailMessage): Promise<void>;
}

export const MAIL = Symbol("MAIL");
