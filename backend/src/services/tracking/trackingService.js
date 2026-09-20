import { scrapeProduct } from '../scraper/productScraper.js';
import { trackingRepository } from '../../repositories/trackingRepository.js';
import { config } from '../../config/env.js';

// Catalog Cache (5-minute TTL)
let catalogCache = null;
let catalogCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

async function fetchFullCatalog() {
  const now = Date.now();
  if (catalogCache && now - catalogCacheTimestamp < CACHE_TTL_MS) {
    return catalogCache;
  }

  const pageSize = 60;
  const firstRes = await fetch(`${config.storeBaseUrl}/api/catalog?page=1&pageSize=${pageSize}`);
  if (!firstRes.ok) {
    throw new Error(`Failed to fetch catalog from store API (Status: ${firstRes.status})`);
  }

  const firstData = await firstRes.json();
  const total = firstData.total || 1000;
  const totalPages = Math.ceil(total / pageSize);
  let allItems = [...(firstData.items || [])];

  if (totalPages > 1) {
    const pagePromises = [];
    for (let p = 2; p <= totalPages; p++) {
      pagePromises.push(
        fetch(`${config.storeBaseUrl}/api/catalog?page=${p}&pageSize=${pageSize}`)
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      );
    }
    const pageResults = await Promise.all(pagePromises);
    for (const res of pageResults) {
      if (res && res.items) {
        allItems.push(...res.items);
      }
    }
  }

  catalogCache = allItems;
  catalogCacheTimestamp = now;
  return allItems;
}

export const trackingService = {
  /**
   * Search INE storefront products across all 1000 items in catalog by full, partial, or multi-word query string.
   */
  async searchStoreProducts(query = '') {
    const items = await fetchFullCatalog();

    if (!query.trim()) {
      return items.slice(0, 20);
    }

    const queryTerms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);

    // Multi-term and substring matching across product fields
    return items.filter((item) => {
      const haystack = `${item.name || ''} ${item.brand || ''} ${item.category || ''} ${item.sku || ''}`.toLowerCase();
      return queryTerms.every((term) => haystack.includes(term));
    });
  },

  /**
   * Start tracking a product from the INE storefront.
   * Immediately inserts product record and triggers initial scrape.
   */
  async trackProduct(externalProductId) {
    const extId = Number(externalProductId);

    // Check if already tracked
    const existing = await trackingRepository.getTrackedProductById(extId);
    if (existing) {
      return {
        product: existing,
        alreadyTracked: true,
        message: 'Product is already being tracked',
      };
    }

    // Fetch product details from store API
    const detailUrl = `${config.storeBaseUrl}/api/product/${extId}`;
    const response = await fetch(detailUrl);

    if (!response.ok) {
      throw new Error(`Product ID ${extId} not found on INE storefront.`);
    }

    const storeProduct = await response.json();

    const productRecord = await trackingRepository.createTrackedProduct({
      external_product_id: extId,
      product_name: storeProduct.name,
      product_url: `${config.storeBaseUrl}/product/${extId}`,
      category: storeProduct.category,
      sku: storeProduct.sku,
      current_price: null,
      current_stock: null,
    });

    // Execute initial scrape asynchronously or inline
    let scrapeResult = null;
    try {
      scrapeResult = await this.scrapeAndPersistProduct(productRecord.id, { headed: false });
    } catch (e) {
      console.error(`[TRACKING] Initial scrape for product ${extId} encountered error:`, e.message);
    }

    const updatedProduct = (await trackingRepository.getTrackedProductById(productRecord.id)) || productRecord;

    return {
      product: updatedProduct,
      alreadyTracked: false,
      initialScrape: scrapeResult,
    };
  },

  /**
   * Scrapes product, logs attempt, validates output, and updates history.
   * CRITICAL DATA VALIDATION RULE:
   * If scrape fails, DO NOT overwrite last known good price or create fake price history.
   * Create an honest failed scrape log entry instead.
   */
  async scrapeAndPersistProduct(trackedProductId, options = {}) {
    const product = await trackingRepository.getTrackedProductById(trackedProductId);
    if (!product) {
      throw new Error(`Tracked product ID ${trackedProductId} not found`);
    }

    const startedAt = new Date().toISOString();
    let scrapeOutput = null;
    let scrapeError = null;

    try {
      scrapeOutput = await scrapeProduct(product.external_product_id, {
        headed: options.headed || false,
        maxRetries: options.maxRetries || config.scrapeMaxRetries,
      });
    } catch (err) {
      scrapeError = err;
    }

    const completedAt = new Date().toISOString();
    const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();

    // 1. If scrape failed completely
    if (scrapeError || !scrapeOutput) {
      const errorMsg = scrapeError ? scrapeError.message : 'Unknown scraper error';
      console.error(`[SCRAPE_FAILED] Honest log recorded for product "${product.product_name}": ${errorMsg}`);

      // Record honest failed scrape log
      const logRecord = await trackingRepository.insertScrapeLog({
        tracked_product_id: product.id,
        external_product_id: product.external_product_id,
        started_at: startedAt,
        completed_at: completedAt,
        status: 'FAILED',
        attempt_number: scrapeError?.details?.attemptLogs?.length || config.scrapeMaxRetries,
        duration_ms: durationMs,
        error_message: errorMsg,
        extracted_price: null,
        extracted_stock: null,
        metadata: {
          headed: options.headed || false,
          attemptLogs: scrapeError?.details?.attemptLogs || [],
        },
      });

      return {
        success: false,
        status: 'FAILED',
        error: errorMsg,
        log: logRecord,
        product, // Preserves unchanged current_price and current_stock
      };
    }

    // 2. Scrape Succeeded - Validate extracted data strictly
    const { price, stock, finalStatus, attempts, attemptLogs } = scrapeOutput;

    // Insert attempt log record
    const logRecord = await trackingRepository.insertScrapeLog({
      tracked_product_id: product.id,
      external_product_id: product.external_product_id,
      started_at: startedAt,
      completed_at: completedAt,
      status: finalStatus, // SUCCESS or RETRIED
      attempt_number: attempts,
      duration_ms: durationMs,
      error_message: null,
      extracted_price: price,
      extracted_stock: stock,
      metadata: {
        headed: options.headed || false,
        attemptLogs: attemptLogs || [],
      },
    });

    // Update tracked product current price and stock
    const updatedProduct = await trackingRepository.updateProductPriceAndStock(product.id, price, stock);

    // Insert price and stock history record
    const historyRecord = await trackingRepository.insertPriceHistory({
      tracked_product_id: product.id,
      price,
      stock,
      scraped_at: completedAt,
    });

    return {
      success: true,
      status: finalStatus,
      price,
      stock,
      product: updatedProduct,
      log: logRecord,
      history: historyRecord,
    };
  },

  /**
   * Run batch scrape across all active tracked products (for external cron trigger).
   */
  async runBatchScrapeJob() {
    const products = await trackingRepository.getAllTrackedProducts();
    const activeProducts = products.filter((p) => p.is_active);

    console.log(`[BATCH_CRON] Starting batch scrape for ${activeProducts.length} active products...`);
    const results = [];

    // Process sequentially so one product failure never terminates the batch
    for (const prod of activeProducts) {
      try {
        console.log(`[BATCH_CRON] Scraping product ${prod.external_product_id} (${prod.product_name})...`);
        const result = await this.scrapeAndPersistProduct(prod.id, { headed: false });
        results.push({
          productId: prod.id,
          externalId: prod.external_product_id,
          success: result.success,
          status: result.status,
          price: result.price ?? null,
          error: result.error ?? null,
        });
      } catch (err) {
        console.error(`[BATCH_CRON] Unhandled error scraping product ${prod.external_product_id}:`, err.message);
        results.push({
          productId: prod.id,
          externalId: prod.external_product_id,
          success: false,
          status: 'FAILED',
          error: err.message,
        });
      }
    }

    console.log(`[BATCH_CRON] Batch scrape complete. Total processed: ${results.length}`);
    return {
      totalProcessed: results.length,
      successCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    };
  },
};
