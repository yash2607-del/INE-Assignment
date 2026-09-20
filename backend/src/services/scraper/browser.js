import puppeteer from 'puppeteer';
import fs from 'fs';
import { config } from '../../config/env.js';

/**
 * Helper to find local system Chrome executable on Windows/Mac/Linux if Puppeteer cache is absent
 */
function findSystemChromePath() {
  const possiblePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];

  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

/**
 * Creates and configures a Puppeteer browser instance.
 * Supports both headless mode for automated scheduled jobs and headed mode for live demonstrations.
 *
 * @param {Object} options
 * @param {boolean} options.headed - If true, launches headed browser (headless: false)
 * @param {number} options.slowMo - Optional slowdown in ms for headed demo clarity
 */
export async function launchBrowser(options = {}) {
  const isHeaded = options.headed === true;

  console.log(`[SCRAPER] Launching Puppeteer browser (Headed: ${isHeaded})...`);

  const launchOptions = {
    headless: !isHeaded,
    slowMo: options.slowMo || (isHeaded ? 100 : 0),
    defaultViewport: { width: 1280, height: 800 },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800',
    ],
  };

  // Try standard Puppeteer bundled browser launch first
  try {
    const browser = await puppeteer.launch(launchOptions);
    return browser;
  } catch (err) {
    console.warn('[SCRAPER] Bundled Puppeteer browser launch failed. Attempting system Chrome fallback...', err.message);
    const systemChromePath = findSystemChromePath();
    if (systemChromePath) {
      console.log(`[SCRAPER] Using system Chrome executable: ${systemChromePath}`);
      return await puppeteer.launch({
        ...launchOptions,
        executablePath: systemChromePath,
      });
    }
    throw err;
  }
}

/**
 * Creates a new pre-configured browser page with realistic User-Agent and viewport.
 */
export async function createPage(browser) {
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  // Set default navigation timeout
  page.setDefaultNavigationTimeout(config.scrapeTimeoutMs);
  page.setDefaultTimeout(config.scrapeTimeoutMs);

  return page;
}

/**
 * Safely closes browser resources without throwing unhandled exceptions.
 */
export async function closeBrowserSafely(browser) {
  if (browser) {
    try {
      await browser.close();
      console.log('[SCRAPER] Browser closed cleanly.');
    } catch (err) {
      console.error('[SCRAPER] Warning: Error closing browser instance:', err.message);
    }
  }
}
