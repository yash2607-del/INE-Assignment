import { launchBrowser, createPage, closeBrowserSafely } from './browser.js';
import { SELECTORS } from './selectors.js';
import { parseAndValidatePrice, parseAndValidateStock, ScraperError } from './scraperTypes.js';
import { withRetry, delay } from './retry.js';
import { config } from '../../config/env.js';

/**
 * Single product scrape routine using Puppeteer.
 * Orchestrates navigation, cookie banner handling, mouse movement dwell validation,
 * clicking "Reveal price", waiting for async quote, and extracting price/stock.
 *
 * @param {number|string} productId - Product ID (e.g., 871)
 * @param {Object} options
 * @param {boolean} options.headed - Run Puppeteer in headed mode for demo
 * @param {number} options.slowMo - Slowdown ms for headed mode
 * @param {Function} options.onAttemptLog - Callback for attempt logging
 */
export async function scrapeProductSingleAttempt(productId, options = {}) {
  const targetUrl = `${config.storeBaseUrl}/product/${productId}`;
  const startTime = Date.now();

  let browser = null;
  let page = null;

  try {
    browser = await launchBrowser({
      headed: options.headed,
      slowMo: options.slowMo,
    });

    page = await createPage(browser);

    console.log(`[SCRAPE] Navigating to target URL: ${targetUrl}`);
    await page.goto(targetUrl, {
      waitUntil: 'domcontentloaded',
      timeout: config.scrapeTimeoutMs,
    });

    await delay(500);

    // 1. Check and dismiss Cookie Consent Banner if present
    try {
      const cookieBtn = await page.$(SELECTORS.cookieAcceptBtn);
      if (cookieBtn) {
        console.log('[SCRAPE] Cookie banner detected. Dismissing...');
        await cookieBtn.click();
        await delay(400);
      }
    } catch (e) {
      console.log('[SCRAPE] Cookie banner check non-fatal notice:', e.message);
    }

    // Also remove any cookie overlay if still blocking pointer events
    await page.evaluate(() => {
      const overlay = document.querySelector('.cookie-overlay, [role="dialog"][aria-label="Cookie consent"]');
      if (overlay) {
        overlay.remove();
        document.body.style.overflow = 'auto';
      }
    }).catch(() => {});

    // 2. Locate Price Block container and scroll into view
    await page.waitForSelector(SELECTORS.priceBlock, { timeout: 10000 });
    const priceBlock = await page.$(SELECTORS.priceBlock);

    if (!priceBlock) {
      throw new ScraperError(`Price block element not found on page: ${targetUrl}`, 'SELECTOR_NOT_FOUND');
    }

    await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    }, SELECTORS.priceBlock);

    await delay(200);

    // 3. Satisfy Mouse Dwell and Movement Validation (min 8 moves, min 600ms dwell time)
    const boundingBox = await priceBlock.boundingBox();
    if (!boundingBox) {
      throw new ScraperError('Price block element bounding box not accessible', 'ELEMENT_NOT_VISIBLE');
    }

    const centerX = boundingBox.x + boundingBox.width / 2;
    const centerY = boundingBox.y + boundingBox.height / 2;

    console.log('[SCRAPE] Simulating mouse movements over price area to fulfill anti-bot dwell requirement...');
    
    // Trigger mouseenter and move to price block
    await page.mouse.move(centerX, centerY);

    // Perform synthetic mouse movements across the price block over >800ms
    for (let i = 0; i < 15; i++) {
      const offsetX = (Math.random() - 0.5) * (boundingBox.width * 0.7);
      const offsetY = (Math.random() - 0.5) * (boundingBox.height * 0.7);
      const moveX = Math.round(centerX + offsetX);
      const moveY = Math.round(centerY + offsetY);

      await page.mouse.move(moveX, moveY);

      // Dispatch mousemove event directly on element to guarantee state tracker update
      await page.evaluate((x, y, sel) => {
        const el = document.querySelector(sel);
        if (el) {
          const ev = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y,
            view: window,
          });
          el.dispatchEvent(ev);
        }
      }, moveX, moveY, SELECTORS.priceBlock);

      await delay(80);
    }

    // Additional dwell wait to guarantee >600ms dwell time requirement
    await delay(400);

    // 4. Wait for "Reveal price" button to become enabled
    console.log('[SCRAPE] Waiting for "Reveal price" button to become enabled...');
    await page.waitForSelector(SELECTORS.revealPriceBtnEnabled, { timeout: 10000 });

    const revealBtn = await page.$(SELECTORS.revealPriceBtnEnabled);
    if (!revealBtn) {
      throw new ScraperError('"Reveal price" button remained disabled or missing', 'REVEAL_BTN_DISABLED');
    }

    // 5. Click "Reveal price" button
    console.log('[SCRAPE] Clicking "Reveal price" button...');
    await revealBtn.click();

    // 6. Wait for price success state (.price-block.price-success)
    console.log('[SCRAPE] Waiting for price and stock extraction elements...');
    await page.waitForSelector(`${SELECTORS.priceSuccess}, ${SELECTORS.priceError}`, {
      timeout: 15000,
    });

    // Check if storefront returned price error
    const priceErrorEl = await page.$(SELECTORS.priceError);
    if (priceErrorEl) {
      const errorMsg = await page.$eval(SELECTORS.priceStatusText, (el) => el.textContent || '').catch(() => '');
      throw new ScraperError(`Storefront price loading failed: ${errorMsg}`, 'STORE_RESPONSE_ERROR');
    }

    // 7. Extract Visible Price Text (excluding hidden decoy elements)
    const rawPriceText = await page.evaluate((selectors) => {
      const priceMain = document.querySelector(selectors.priceSuccess + ' ' + selectors.priceMain);
      if (!priceMain) return null;

      const clone = priceMain.cloneNode(true);
      const decoys = clone.querySelectorAll(selectors.decoyPriceAmount + ', [aria-hidden="true"][style*="display:none"]');
      decoys.forEach((d) => d.remove());

      return clone.textContent;
    }, SELECTORS);

    if (!rawPriceText) {
      throw new ScraperError('Extracted price text was null or missing in price success container', 'EXTRACTION_FAILED');
    }

    // 8. Extract Visible Stock Text
    const rawStockText = await page.evaluate((selectors) => {
      const stockEl = document.querySelector(selectors.priceSuccess + ' ' + selectors.stockBadge);
      return stockEl ? stockEl.textContent : null;
    }, SELECTORS);

    if (!rawStockText) {
      throw new ScraperError('Extracted stock badge text was null or missing', 'EXTRACTION_FAILED');
    }

    // 9. Parse and validate outputs strictly
    const price = parseAndValidatePrice(rawPriceText);
    const stock = parseAndValidateStock(rawStockText);

    // Extract product details if available
    const productName = await page.$eval(SELECTORS.productTitle, (el) => el.textContent.trim()).catch(() => '');

    const durationMs = Date.now() - startTime;
    console.log(`[SCRAPE] Success! Extracted Price: ${price}, Stock: ${stock}, Product: "${productName}" (${durationMs}ms)`);

    return {
      productId: Number(productId),
      productName,
      price,
      stock,
      rawPriceText: rawPriceText.trim(),
      rawStockText: rawStockText.trim(),
      durationMs,
      targetUrl,
    };
  } finally {
    await closeBrowserSafely(browser);
  }
}

/**
 * Public scraper entrypoint.
 * Executes product scraping with bounded exponential backoff retries and attempt logging.
 */
export async function scrapeProduct(productId, options = {}) {
  const attemptLogs = [];

  const handleLog = (logEntry) => {
    attemptLogs.push(logEntry);
    if (options.onAttemptLog) {
      options.onAttemptLog(logEntry);
    }
  };

  try {
    const result = await withRetry(
      async (attemptNumber) => {
        return await scrapeProductSingleAttempt(productId, {
          ...options,
          attemptNumber,
        });
      },
      {
        maxRetries: options.maxRetries || config.scrapeMaxRetries,
        baseDelayMs: options.baseDelayMs || config.scrapeRetryBaseDelayMs,
        onAttemptLog: handleLog,
      }
    );

    return {
      ...result,
      attemptLogs,
    };
  } catch (err) {
    throw new ScraperError(
      err.message || 'Product scraping failed after max retries',
      err.code || 'SCRAPE_FAILED_ALL_ATTEMPTS',
      { attemptLogs, productId }
    );
  }
}
