import { config } from '../config/env.js';

/**
 * Authentication middleware for scheduled cron trigger endpoint.
 * Validates x-cron-secret header or Bearer token against CRON_SECRET.
 */
export function authenticateCron(req, res, next) {
  const cronSecretHeader = req.headers['x-cron-secret'];
  const authHeader = req.headers['authorization'];

  let token = cronSecretHeader;
  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token || token !== config.cronSecret) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing cron secret authentication token.',
    });
  }

  next();
}
