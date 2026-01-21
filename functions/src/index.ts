import nodemailer, { Transporter } from 'nodemailer';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin if not already initialized
// In Cloud Functions v2, initializeApp() without params automatically uses
// the default service account credentials for the project where the function is deployed
try {
  if (getApps().length === 0) {
    initializeApp();
  }
} catch (error) {
  // Admin might already be initialized, ignore error
  console.warn('Firebase Admin initialization check:', error);
}

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

// Allowed origins - shared across all functions
const allowedOrigins: Array<string> = [
  'https://mixmi.co',
  'https://mixmi-66529.web.app',
  'https://mixmi-66529.firebaseapp.com',
  'https://admin.mixmi.co',
  'http://localhost:3000', // For local development
  'http://localhost:4173'   // For local development
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

// Helper to check if user is admin
const isAdmin = (token: DecodedIdToken): boolean => {
  return token.admin === true || token.role === 'admin' || token.role === 'superadmin';
};

const sanitizeDownloadFilename = (value: string): string => {
  return value
    .replace(/[\r\n"]/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
    .trim()
    .slice(0, 200) || 'download';
};

// Helper function to set CORS headers
const setCorsHeaders = (request: any, response: any): void => {
  const origin = request.get('origin');
  if (origin && allowedOrigins.includes(origin)) {
    response.set('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    logger.warn(`[downloadStorageFile] Blocked request from unauthorized origin: ${origin}`);
  }
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.set('Access-Control-Max-Age', '3600');
};

// Download proxy for admin users - bypasses CORS
export const downloadStorageFile = onRequest(
  {
    cors: allowedOrigins,
    region: 'us-central1',
    invoker: 'public', // Public but requires auth token
  },
  async (request, response) => {
    const origin = request.get('origin');
    const method = request.method;
    
    logger.info(`[downloadStorageFile] ${method} request from origin: ${origin || 'none'}`);
    
    // Set CORS headers on all responses
    setCorsHeaders(request, response);
    
    // Handle OPTIONS preflight request
    if (method === 'OPTIONS') {
      logger.info('[downloadStorageFile] Handling OPTIONS preflight request');
      response.status(204).send('');
      return;
    }
    
    try {
      // Verify authentication
      const authHeader = request.get('Authorization');
      const tokenFromHeader =
        typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
          ? authHeader.split('Bearer ')[1]
          : null;
      const tokenFromQuery = typeof request.query.token === 'string' ? request.query.token : null;
      const idToken = tokenFromHeader || tokenFromQuery;

      if (!idToken) {
        logger.warn('[downloadStorageFile] Missing auth token (header or query)');
        response.status(401).json({ error: 'Unauthorized: Missing auth token' });
        return;
      }

      let decodedToken: DecodedIdToken;
      
      try {
        // Verify token with explicit project ID check
        decodedToken = await getAuth().verifyIdToken(idToken, true); // Check revoked tokens
      } catch (error: any) {
        logger.error('[downloadStorageFile] Token verification failed:', {
          error: error.message,
          code: error.code,
          name: error.name,
          tokenLength: idToken.length,
          tokenPrefix: idToken.substring(0, 20),
          fullError: error.toString()
        });
        
        // Return detailed error in response for debugging
        const errorDetails: any = {
          error: 'Unauthorized: Invalid token',
          code: error.code || 'unknown',
          message: error.message || 'Token verification failed'
        };
        
        // Include more details in development
        if (process.env.NODE_ENV !== 'production') {
          errorDetails.tokenLength = idToken.length;
          errorDetails.errorName = error.name;
        }
        
        response.status(401).json(errorDetails);
        return;
      }

      // Verify admin status
      if (!isAdmin(decodedToken)) {
        logger.warn(`[downloadStorageFile] Non-admin user attempted download: ${decodedToken.uid}, origin: ${origin || 'none'}`);
        response.status(403).json({ error: 'Forbidden: Admin access required' });
        return;
      }

      // Get storage path from query parameter
      const storagePath = request.query.path as string;
      if (!storagePath) {
        logger.warn(`[downloadStorageFile] Missing storage path parameter, origin: ${origin || 'none'}`);
        response.status(400).json({ error: 'Bad request: Missing storage path' });
        return;
      }

      // Validate path (prevent path traversal)
      if (storagePath.includes('..') || !storagePath.startsWith('exports/')) {
        logger.warn(`[downloadStorageFile] Invalid storage path attempted: ${storagePath}, origin: ${origin || 'none'}`);
        response.status(400).json({ error: 'Bad request: Invalid storage path' });
        return;
      }

      logger.info(`[downloadStorageFile] Admin ${decodedToken.uid} downloading: ${storagePath}, origin: ${origin || 'none'}`);

      // Get file from Firebase Storage
      const bucket = getStorage().bucket();
      const file = bucket.file(storagePath);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        logger.warn(`[downloadStorageFile] File not found: ${storagePath}, origin: ${origin || 'none'}`);
        response.status(404).json({ error: 'File not found' });
        return;
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();
      const contentType = metadata.contentType || 'application/octet-stream';
      const requestedFilename = typeof request.query.filename === 'string' ? request.query.filename : '';
      const fallbackFilename = storagePath.split('/').pop() || 'download';
      const safeFilename = sanitizeDownloadFilename(requestedFilename || fallbackFilename);
      const contentDisposition = `attachment; filename="${safeFilename}"`;

      // Set headers
      response.set('Content-Type', contentType);
      response.set('Content-Disposition', contentDisposition);
      response.set('Cache-Control', 'private, max-age=3600');

      // Stream file to response
      const stream = file.createReadStream();
      stream.pipe(response);
      
      stream.on('error', (error: Error) => {
        logger.error(`[downloadStorageFile] Error streaming file ${storagePath}:`, error);
        if (!response.headersSent) {
          response.status(500).json({ error: 'Failed to download file' });
        }
      });

    } catch (error) {
      logger.error(`[downloadStorageFile] Unexpected error, origin: ${origin || 'none'}, method: ${method}:`, error);
      if (!response.headersSent) {
        response.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);
