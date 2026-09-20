import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { parseAndValidatePrice, parseAndValidateStock, ScraperError } from '../src/services/scraper/scraperTypes.js';
import { trackingService } from '../src/services/tracking/trackingService.js';
import { trackingRepository } from '../src/repositories/trackingRepository.js';

describe('Price and Stock Validation Unit Tests', () => {
  test('parseAndValidatePrice converts valid price strings to numeric floats', () => {
    assert.equal(parseAndValidatePrice('₹49,999'), 49999);
    assert.equal(parseAndValidatePrice('Rs. 1,299/- (incl. of all taxes)'), 1299);
    assert.equal(parseAndValidatePrice('₹ 42.50'), 42.5);
    assert.equal(parseAndValidatePrice('999'), 999);
  });

  test('parseAndValidatePrice throws ScraperError for invalid or missing price formats', () => {
    assert.throws(() => parseAndValidatePrice(''), ScraperError);
    assert.throws(() => parseAndValidatePrice('Price Hidden'), ScraperError);
    assert.throws(() => parseAndValidatePrice(null), ScraperError);
  });

  test('parseAndValidateStock extracts numeric quantities and handles Out of stock', () => {
    assert.equal(parseAndValidateStock('In stock · 14 left'), 14);
    assert.equal(parseAndValidateStock('Only 5 left'), 5);
    assert.equal(parseAndValidateStock('12 in stock'), 12);
    assert.equal(parseAndValidateStock('Out of stock'), 0);
  });
});

describe('Data Integrity and Overwrite Prevention Tests', () => {
  test('Failed scrape does NOT overwrite last known good price or create price history record', async () => {
    // 1. Create a mock tracked product with an existing valid price
    const initialProduct = await trackingRepository.createTrackedProduct({
      external_product_id: 9999,
      product_name: 'Test Integrity Phone',
      product_url: 'https://demo.inelabteamdev.com/product/9999',
      current_price: 15000,
      current_stock: 8,
    });

    assert.equal(initialProduct.current_price, 15000);
    assert.equal(initialProduct.current_stock, 8);

    // 2. Simulate a failed scrape call for product 9999 (invalid product ID)
    const scrapeResult = await trackingService.scrapeAndPersistProduct(initialProduct.id, {
      maxRetries: 1,
    });

    assert.equal(scrapeResult.success, false);
    assert.equal(scrapeResult.status, 'FAILED');

    // 3. Verify product current_price and current_stock REMAIN UNCHANGED
    const updatedProduct = await trackingRepository.getTrackedProductById(initialProduct.id);
    assert.equal(updatedProduct.current_price, 15000);
    assert.equal(updatedProduct.current_stock, 8);

    // 4. Verify an honest scrape log was created
    const logs = await trackingRepository.getScrapeLogsByProductId(initialProduct.id);
    assert.equal(logs.length, 1);
    assert.equal(logs[0].status, 'FAILED');
    assert.notEqual(logs[0].error_message, null);

    // 5. Verify NO price_history record was created for the failed attempt
    const history = await trackingRepository.getPriceHistoryByProductId(initialProduct.id);
    assert.equal(history.length, 0);
  });
});
