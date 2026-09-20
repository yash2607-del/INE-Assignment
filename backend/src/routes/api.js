import { Router } from 'express';
import { productController } from '../controllers/productController.js';
import { trackingController } from '../controllers/trackingController.js';
import { authenticateCron } from '../middleware/auth.js';

const router = Router();

// Health Check Endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'INE Product Price Tracker API',
    timestamp: new Date().toISOString(),
  });
});

// Product Search
router.get('/products/search', productController.searchProducts);

// Tracked Products Management
router.post('/tracked-products', trackingController.trackProduct);
router.get('/tracked-products', trackingController.getTrackedProducts);
router.get('/tracked-products/:id', trackingController.getTrackedProductById);
router.get('/tracked-products/:id/history', trackingController.getPriceHistory);
router.get('/tracked-products/:id/scrape-logs', trackingController.getScrapeLogs);
router.post('/tracked-products/:id/scrape', trackingController.triggerManualScrape);

// Authenticated External Cron Trigger Endpoint
router.post('/scrape/run', authenticateCron, trackingController.triggerBatchScrapeCron);

export default router;
