import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Email transport — provider-agnostic SMTP (Nodemailer).
 *
 * TEST (SendGrid):  SMTP_HOST=smtp.sendgrid.net  SMTP_PORT=587
 *                   SMTP_USER=apikey  SMTP_PASS=<sendgrid-api-key>
 * PRODUCTION:       point SMTP_* at an in-territory (VN) server — data-localization.
 *
 * If SMTP_HOST is unset, falls back to logging the message (incl. links) to the
 * server console so the email/verification flow is fully testable WITHOUT any
 * credentials in dev. Swapping providers is config-only — no code change.
 */
let _transport: Transporter | null | undefined;

function getTransport(): Transporter | null {
  if (_transport !== undefined) return _transport;
  const host = process.env.SMTP_HOST;
  if (!host) {
    _transport = null; // dev fallback (console)
    return _transport;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  _transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" }
      : undefined,
  });
  return _transport;
}

const FROM = process.env.SMTP_FROM ?? "Blackcrest <no-reply@blackcrest.vn>";

/** Absolute base URL for links inside emails. */
export function getAppUrl(): string {
  return (
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ delivered: boolean }> {
  const transport = getTransport();
  if (!transport) {
    console.warn(
      `\n[mailer:dev] SMTP not configured — email NOT sent (dev fallback).\n` +
        `  To:      ${opts.to}\n  Subject: ${opts.subject}\n  ${opts.text}\n`,
    );
    return { delivered: false };
  }
  await transport.sendMail({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  return { delivered: true };
}

/** Minimal, brand-restrained verification email (monochrome, no external assets). */
export function buildVerificationEmail(opts: {
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
  fallbackNote: string;
  expiryNote: string;
}): { subject: string; html: string; text: string } {
  const { subject, heading, intro, buttonLabel, url, fallbackNote, expiryNote } = opts;
  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f6;padding:32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1d21">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #e8e8ec;border-radius:4px;overflow:hidden">
<tr><td style="background:#0c0d10;padding:18px 24px;color:#fff;font-weight:600;letter-spacing:.04em">BLACKCREST</td></tr>
<tr><td style="padding:28px 24px">
<h1 style="margin:0 0 12px;font-size:20px;font-weight:600">${heading}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3c4149">${intro}</p>
<a href="${url}" style="display:inline-block;background:#16181d;color:#fff;text-decoration:none;padding:11px 22px;border-radius:2px;font-size:13px;font-weight:600;letter-spacing:.06em;text-transform:uppercase">${buttonLabel}</a>
<p style="margin:22px 0 6px;font-size:12px;color:#686e76">${fallbackNote}</p>
<p style="margin:0 0 16px;font-size:12px;word-break:break-all"><a href="${url}" style="color:#16181d">${url}</a></p>
<p style="margin:0;font-size:12px;color:#9aa0a8">${expiryNote}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${heading}\n\n${intro}\n\n${buttonLabel}: ${url}\n\n${expiryNote}`;
  return { subject, html, text };
}
