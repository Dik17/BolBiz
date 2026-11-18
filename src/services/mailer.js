// SMTP mailer for the Titan mailbox on our domain. Credentials only come from env vars.
import nodemailer from 'nodemailer';
import { config, isConfigured } from '../config.js';

let transport = null;
function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transport;
}

// Strip CR/LF so user input can never inject extra mail headers.
const oneLine = (s, max = 200) => String(s ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

/**
 * @returns {Promise<{sent:boolean, reason?:string}>}
 */
export async function sendMail({ to, subject, text, replyTo }, { transportImpl } = {}) {
  if (!isConfigured.smtp() && !transportImpl) return { sent: false, reason: 'smtp-not-configured' };
  const t = transportImpl || getTransport();
  await t.sendMail({
    from: `BolBiz <${config.smtp.from}>`,
    to: oneLine(to || config.smtp.contactTo),
    subject: oneLine(subject, 150),
    text: String(text ?? '').slice(0, 10000),
    ...(replyTo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(replyTo) ? { replyTo: oneLine(replyTo) } : {}),
  });
  return { sent: true };
}

export const _test = { oneLine };
