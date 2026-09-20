import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend root or workspace root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
  storeBaseUrl: (process.env.STORE_BASE_URL || 'https://demo.inelabteamdev.com').replace(/\/$/, ''),
  scrapeTimeoutMs: parseInt(process.env.SCRAPE_TIMEOUT_MS || '30000', 10),
  scrapeMaxRetries: parseInt(process.env.SCRAPE_MAX_RETRIES || '3', 10),
  scrapeRetryBaseDelayMs: parseInt(process.env.SCRAPE_RETRY_BASE_DELAY_MS || '1000', 10),
  cronSecret: process.env.CRON_SECRET || 'dev-cron-secret',
};
