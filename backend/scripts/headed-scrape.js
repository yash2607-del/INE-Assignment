import { scrapeProduct } from '../src/services/scraper/productScraper.js';

/**
 * Headed Scraper CLI Demonstration Script.
 * Runs Puppeteer in headed mode (headless: false) with visual delays,
 * demonstrating live navigation, cookie banner handling, mouse movement dwell,
 * clicking "Reveal price", waiting for success, and printing structured logs.
 *
 * Usage:
 *   npm run scrape:headed -- [productId]
 *   node scripts/headed-scrape.js 871
 */
async function runHeadedDemo() {
  const args = process.argv.slice(2);
  const productId = args[0] || '871'; // Default to product 871 if no argument provided

  console.log(`==================================================`);
  console.log(`🎥 INE SCRAPER HEADED DEMONSTRATION MODE`);
  console.log(`Target Product ID: ${productId}`);
  console.log(`Browser: Headed Chromium (headless: false)`);
  console.log(`==================================================`);

  const startTime = Date.now();

  try {
    const result = await scrapeProduct(productId, {
      headed: true,
      slowMo: 80, // Slowdown ms to make interactions clearly visible
      onAttemptLog: (log) => {
        const timestamp = new Date().toISOString().substring(11, 19);
        console.log(`[${timestamp}] [SCRAPE_ATTEMPT ${log.attempt}/${log.maxRetries}] Status: ${log.status} | ${log.message}`);
      },
    });

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n==================================================`);
    console.log(`✅ HEADED SCRAPE COMPLETED SUCCESSFULLY (${totalDuration}s)`);
    console.log(`==================================================`);
    console.log(`📦 Product ID:      ${result.productId}`);
    console.log(`🏷️  Product Name:    ${result.productName}`);
    console.log(`💰 Extracted Price:  ₹${result.price}`);
    console.log(`📊 Extracted Stock:  ${result.stock} units`);
    console.log(`🔁 Total Attempts:   ${result.attempts}`);
    console.log(`⏱️  Scrape Duration:  ${result.durationMs}ms`);
    console.log(`==================================================\n`);

    // Give visual delay before exiting so user can see final browser state
    await new Promise((res) => setTimeout(res, 3000));
    process.exit(0);
  } catch (err) {
    console.error(`\n❌ HEADED SCRAPE FAILED`);
    console.error(`Error Message: ${err.message}`);
    if (err.details && err.details.attemptLogs) {
      console.error(`Attempt Logs:`, JSON.stringify(err.details.attemptLogs, null, 2));
    }
    process.exit(1);
  }
}

runHeadedDemo();
