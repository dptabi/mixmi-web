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
      rejectUnauthorized: true // SECURE: Validate SSL certificates to prevent MITM attacks
    }
  });

const isValidEmail = (value?: string): value is string =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Allowed origins - remove localhost for production
const allowedOrigins: Array<string> = [
  'https://mixmi.co',
  'https://mixmi-66529.web.app',
  'https://mixmi-66529.firebaseapp.com',
  // 'http://localhost:4173' // Only for local development - remove in production
];

// Simple rate limiting store (in-memory, resets on function restart)
// For production, consider using Redis or Firebase Realtime Database
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // Max 5 requests per minute per IP

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  record.count++;
  return true;
};

export const sendWelcomeEmail = onRequest(
  {
    cors: allowedOrigins,
    region: 'us-central1',
    invoker: 'public', // TODO: Consider using Firebase App Check for additional security
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
    // CORS validation
    const origin = request.get('origin');
    if (origin && !allowedOrigins.includes(origin)) {
      response.status(403).json({ error: 'Forbidden: Invalid origin' });
      return;
    }

    if (request.method !== 'POST') {
      response.set('Allow', 'POST');
      response.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Rate limiting
    const clientIp = request.ip || request.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(clientIp)) {
      logger.warn(`[sendWelcomeEmail] Rate limit exceeded for IP: ${clientIp}`);
      response.status(429).json({ error: 'Too many requests. Please try again later.' });
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
        subject: 'Welcome to Mixmi 🎉',
        text: `Hey there!

Thanks for subscribing to Mixmi. You're officially on the inside now.

We'll send you updates on new features, launches, and creative tools as they roll out—nothing spammy, just the good stuff.

In the meantime, feel free to explore, get inspired, and start imagining what you'll create.

Glad to have you with us.

— The Mixmi Team`,
        html: `<p>Hey there!</p>
<p>Thanks for subscribing to Mixmi. You're officially on the inside now.</p>
<p>We'll send you updates on new features, launches, and creative tools as they roll out—nothing spammy, just the good stuff.</p>
<p>In the meantime, feel free to explore, get inspired, and start imagining what you'll create.</p>
<p>Glad to have you with us.</p>
<p>— The Mixmi Team</p>`
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

