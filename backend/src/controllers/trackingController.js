import { trackingService } from '../services/tracking/trackingService.js';
import { trackingRepository } from '../repositories/trackingRepository.js';

export const trackingController = {
  /**
   * Start tracking a product
   * POST /api/tracked-products
   */
  async trackProduct(req, res, next) {
    try {
      const { externalProductId } = req.body;
      if (!externalProductId) {
        return res.status(400).json({ error: 'ValidationError', message: 'externalProductId is required' });
      }

      const result = await trackingService.trackProduct(externalProductId);
      res.status(result.alreadyTracked ? 200 : 201).json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get all tracked products
   * GET /api/tracked-products
   */
  async getTrackedProducts(req, res, next) {
    try {
      const products = await trackingRepository.getAllTrackedProducts();
      res.json({ count: products.length, items: products });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get tracked product by ID
   * GET /api/tracked-products/:id
   */
  async getTrackedProductById(req, res, next) {
    try {
      const { id } = req.params;
      const product = await trackingRepository.getTrackedProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'NotFound', message: `Tracked product ID ${id} not found` });
      }

      res.json(product);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get price history for a tracked product
   * GET /api/tracked-products/:id/history
   */
  async getPriceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const product = await trackingRepository.getTrackedProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'NotFound', message: `Tracked product ID ${id} not found` });
      }

      const history = await trackingRepository.getPriceHistoryByProductId(product.id);
      res.json({
        productId: product.id,
        externalProductId: product.external_product_id,
        productName: product.product_name,
        count: history.length,
        items: history,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Get scrape attempt logs for a tracked product
   * GET /api/tracked-products/:id/scrape-logs
   */
  async getScrapeLogs(req, res, next) {
    try {
      const { id } = req.params;
      const product = await trackingRepository.getTrackedProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'NotFound', message: `Tracked product ID ${id} not found` });
      }

      const logs = await trackingRepository.getScrapeLogsByProductId(product.id);
      res.json({
        productId: product.id,
        externalProductId: product.external_product_id,
        productName: product.product_name,
        count: logs.length,
        items: logs,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * Trigger manual scrape for a specific tracked product
   * POST /api/tracked-products/:id/scrape
   */
  async triggerManualScrape(req, res, next) {
    try {
      const { id } = req.params;
      const product = await trackingRepository.getTrackedProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'NotFound', message: `Tracked product ID ${id} not found` });
      }

      const result = await trackingService.scrapeAndPersistProduct(product.id, {
        headed: req.body?.headed === true,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Scheduled cron endpoint to scrape all active tracked products
   * POST /api/scrape/run
   */
  async triggerBatchScrapeCron(req, res, next) {
    try {
      const summary = await trackingService.runBatchScrapeJob();
      res.json({
        message: 'Batch scraping job completed successfully',
        timestamp: new Date().toISOString(),
        ...summary,
      });
    } catch (err) {
      next(err);
    }
  },
};
