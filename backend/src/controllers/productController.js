import { trackingService } from '../services/tracking/trackingService.js';

export const productController = {
  /**
   * Search INE storefront products by partial or full name query
   * GET /api/products/search?q=...
   */
  async searchProducts(req, res, next) {
    try {
      const query = (req.query.q || '').toString();
      const results = await trackingService.searchStoreProducts(query);
      res.json({
        query,
        count: results.length,
        items: results,
      });
    } catch (err) {
      next(err);
    }
  },
};
