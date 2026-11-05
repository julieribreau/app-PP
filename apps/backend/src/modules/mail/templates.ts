import type { MailMessage } from "./mail.port";

export type MailLocale = "fr" | "en";
type Kind = "verifyEmail" | "resetPassword" | "changeEmail";

const COPY: Record<
  MailLocale,
  Record<Kind, { subject: string; intro: string; cta: string; outro: string }>
> = {
  fr: {
    verifyEmail: {
      subject: "Confirmez votre adresse e-mail",
      intro: "Bienvenue sur NutrionApp. Confirmez votre adresse pour activer votre compte.",
      cta: "Confirmer mon adresse",
      outro: "Ce lien est valable une heure. Vous n'avez pas créé de compte ? Ignorez ce message.",
    },
    resetPassword: {
      subject: "Réinitialisez votre mot de passe",
      intro: "Vous avez demandé à changer de mot de passe.",
      cta: "Choisir un nouveau mot de passe",
      outro:
        "Ce lien est valable une heure. Vous n'êtes pas à l'origine de la demande ? Ignorez ce message.",
    },
    changeEmail: {
      subject: "Confirmez votre nouvelle adresse e-mail",
      intro: "Vous avez demandé à utiliser cette adresse pour votre compte NutrionApp.",
      cta: "Confirmer cette adresse",
      outro:
        "Ce lien est valable une heure. Vous n'êtes pas à l'origine de la demande ? Ignorez ce message.",
    },
  },
  en: {
    verifyEmail: {
      subject: "Confirm your email address",
      intro: "Welcome to NutrionApp. Confirm your address to activate your account.",
      cta: "Confirm my address",
      outro: "This link is valid for one hour. Didn't create an account? Ignore this message.",
    },
    resetPassword: {
      subject: "Reset your password",
      intro: "You asked to change your password.",
      cta: "Choose a new password",
      outro: "This link is valid for one hour. Didn't ask for this? Ignore this message.",
    },
    changeEmail: {
      subject: "Confirm your new email address",
      intro: "You asked to use this address for your NutrionApp account.",
      cta: "Confirm this address",
      outro: "This link is valid for one hour. Didn't ask for this? Ignore this message.",
    },
  },
};

const echapper = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );

/** Un e-mail transactionnel aux couleurs de la piste B (terracotta), HTML et texte. */
export function renderMail(
  kind: Kind,
  locale: MailLocale,
  to: string,
  url: string,
  name?: string | null,
): MailMessage {
  const c = COPY[locale][kind];
  const hello = name
    ? locale === "fr"
      ? `Bonjour ${name},`
      : `Hello ${name},`
    : locale === "fr"
      ? "Bonjour,"
      : "Hello,";
  const html = `<!doctype html><html lang="${locale}"><body style="margin:0;background:#fbf5ec;font-family:Arial,sans-serif;color:#2a1d16">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffbf5;border:1px solid #ead9c5;border-radius:24px">
<tr><td style="padding:32px">
<p style="font-family:Georgia,serif;font-size:24px;font-weight:600;margin:0 0 24px">NutrionApp</p>
<p style="font-size:16px;line-height:24px;margin:0 0 12px">${echapper(hello)}</p>
<p style="font-size:16px;line-height:24px;margin:0 0 24px">${echapper(c.intro)}</p>
<p style="margin:0 0 24px"><a href="${echapper(url)}" style="display:inline-block;background:#9c4f33;color:#fffbf5;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:9999px">${echapper(c.cta)}</a></p>
<p style="font-size:14px;line-height:20px;color:#6a5547;margin:0">${echapper(c.outro)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${hello}\n\n${c.intro}\n\n${c.cta} : ${url}\n\n${c.outro}\n`;
  return { to, subject: c.subject, html, text };
}

export const mailLocale = (value: unknown): MailLocale => (value === "en" ? "en" : "fr");
