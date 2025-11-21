import nodemailer, { Transporter } from 'nodemailer';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

type SendEmailRequest = {
  email?: string;
};

type EmailEnvConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  senderEmail: string;
  senderName: string;
};

const emailSmtpHost = defineSecret('EMAIL_SMTP_HOST');
const emailSmtpPort = defineSecret('EMAIL_SMTP_PORT');
const emailUsername = defineSecret('EMAIL_USERNAME');
const emailPassword = defineSecret('EMAIL_PASSWORD');
const senderEmail = defineSecret('SENDER_EMAIL');
const senderName = defineSecret('SENDER_NAME');

const resolveEmailConfig = (): EmailEnvConfig => {
  // Secrets are injected as environment variables when using defineSecret
  // Trim values to remove any newlines from secret storage
  const host = (process.env.EMAIL_SMTP_HOST || emailSmtpHost.value() || '').trim();
  const port = (process.env.EMAIL_SMTP_PORT || emailSmtpPort.value() || '').trim();
  const username = (process.env.EMAIL_USERNAME || emailUsername.value() || '').trim();
  const password = (process.env.EMAIL_PASSWORD || emailPassword.value() || '').trim();
  const fromEmail = (process.env.SENDER_EMAIL || senderEmail.value() || '').trim();
  const fromName = (process.env.SENDER_NAME || senderName.value() || '').trim();

  if (!host || !port || !username || !password || !fromEmail || !fromName) {
    const missing = [];
    if (!host) missing.push('EMAIL_SMTP_HOST');
    if (!port) missing.push('EMAIL_SMTP_PORT');
    if (!username) missing.push('EMAIL_USERNAME');
    if (!password) missing.push('EMAIL_PASSWORD');
    if (!fromEmail) missing.push('SENDER_EMAIL');
    if (!fromName) missing.push('SENDER_NAME');
    const errorMessage = `Missing required email configuration: ${missing.join(', ')}`;
    logger.error(`[sendWelcomeEmail] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  return {
    host,
    port: Number(port),
    username,
    password,
    senderEmail: fromEmail,
    senderName: fromName
  };
};

const createTransporter = (config: EmailEnvConfig): Transporter =>
  nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port === 587,
    auth: {
      user: config.username,
      pass: config.password
    },
    tls: {
      rejectUnauthorized: false
    }
  });

const isValidEmail = (value?: string): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const allowedOrigins: Array<string> = [
  'https://mixmi.co',
  'https://mixmi-66529.web.app',
  'https://mixmi-66529.firebaseapp.com',
  'http://localhost:4173'
];

export const sendWelcomeEmail = onRequest(
  {
    cors: allowedOrigins,
    region: 'us-central1',
    invoker: 'public',
    secrets: [
      emailSmtpHost,
      emailSmtpPort,
      emailUsername,
      emailPassword,
      senderEmail,
      senderName
    ]
  },
  async (request, response) => {
    if (request.method !== 'POST') {
      response.set('Allow', 'POST');
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const body = (request.body ?? {}) as SendEmailRequest;
    const targetEmail = body.email?.trim();

    if (!isValidEmail(targetEmail)) {
      response.status(400).json({ error: 'Invalid email address' });
      return;
    }

    const emailConfig = resolveEmailConfig();

    try {
      logger.info(`[sendWelcomeEmail] Sending welcome email to: ${targetEmail}`);
      const transporter = createTransporter(emailConfig);
      const mailOptions = {
        from: `${emailConfig.senderName} <${emailConfig.senderEmail}>`,
        to: targetEmail,
        subject: 'Welcome to Mixmi',
        text: 'Thanks for joining Mixmi! We will keep you posted about upcoming launches.',
        html: `<p>Thanks for joining Mixmi!</p><p>We will keep you posted about upcoming launches.</p>`
      };
      
      const info = await transporter.sendMail(mailOptions);
      logger.info(`[sendWelcomeEmail] Email sent successfully to ${targetEmail}`, { messageId: info.messageId });
      response.json({ success: true });
    } catch (error) {
      logger.error(`[sendWelcomeEmail] Failed to send email to ${targetEmail}`, error);
      response.status(500).json({ error: 'Failed to send email' });
    }
  }
);

