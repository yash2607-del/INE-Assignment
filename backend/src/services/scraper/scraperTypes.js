/**
 * Custom error class for scraper failures
 */
export class ScraperError extends Error {
  constructor(message, code = 'SCRAPE_FAILURE', details = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Validates and extracts a numeric price from raw price string.
 * Example inputs: "₹49,999", "Rs. 1,299/-", "49,999", "₹ 42.9"
 * Returns numeric float or throws ScraperError if invalid.
 */
export function parseAndValidatePrice(rawPriceText) {
  if (typeof rawPriceText !== 'string' || !rawPriceText.trim()) {
    throw new ScraperError('Extracted price string is empty or missing', 'INVALID_PRICE_FORMAT');
  }

  // Remove currency symbols, commas, trailing taxes text, and extra whitespace
  // Match standard numbers with optional decimal e.g. 49999 or 49999.50
  const cleaned = rawPriceText.replace(/,/g, '');
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);

  if (!match) {
    throw new ScraperError(`Failed to parse numeric price from: "${rawPriceText}"`, 'INVALID_PRICE_FORMAT');
  }

  const priceNum = parseFloat(match[1]);

  if (isNaN(priceNum) || priceNum < 0) {
    throw new ScraperError(`Parsed price value is non-numeric or negative: ${priceNum}`, 'INVALID_PRICE_VALUE');
  }

  return priceNum;
}

/**
 * Validates and extracts stock quantity from stock badge text.
 * Examples:
 * - "In stock · 14 left" => 14
 * - "Only 5 left" => 5
 * - "12 in stock" => 12
 * - "Out of stock" => 0
 */
export function parseAndValidateStock(rawStockText) {
  if (typeof rawStockText !== 'string') {
    throw new ScraperError('Extracted stock text is missing', 'INVALID_STOCK_FORMAT');
  }

  const normalized = rawStockText.trim().toLowerCase();

  if (normalized.includes('out of stock')) {
    return 0;
  }

  const match = normalized.match(/(\d+)/);
  if (match) {
    const stockNum = parseInt(match[1], 10);
    if (!isNaN(stockNum) && stockNum >= 0) {
      return stockNum;
    }
  }

  // If text indicates in-stock but without specific number, default to 1
  if (normalized.includes('in stock')) {
    return 1;
  }

  throw new ScraperError(`Failed to parse stock quantity from: "${rawStockText}"`, 'INVALID_STOCK_FORMAT');
}
