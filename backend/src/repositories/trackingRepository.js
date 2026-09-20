import { createClient } from '@supabase/supabase-js';
import { config } from '../config/env.js';

// Initialize Supabase Client if credentials exist
let supabase = null;
if (config.supabaseUrl && config.supabaseKey) {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    console.log('[DATABASE] Supabase client initialized successfully.');
  } catch (err) {
    console.error('[DATABASE] Error initializing Supabase client:', err.message);
  }
} else {
  console.warn('[DATABASE] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Running with in-memory fallback for local dev.');
}

// In-memory database fallback for local dev when Supabase is not connected
const inMemoryStore = {
  trackedProducts: new Map(), // id => product
  priceHistory: [], // array of history records
  scrapeLogs: [], // array of log records
};

export const trackingRepository = {
  /**
   * Find all active tracked products
   */
  async getAllTrackedProducts() {
    if (supabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(`Supabase query error: ${error.message}`);
      return data || [];
    }

    return Array.from(inMemoryStore.trackedProducts.values());
  },

  /**
   * Find tracked product by database UUID or external_product_id
   */
  async getTrackedProductById(id) {
    if (supabase) {
      const isUuid = typeof id === 'string' && id.includes('-');
      const query = isUuid
        ? supabase.from('tracked_products').select('*').eq('id', id).single()
        : supabase.from('tracked_products').select('*').eq('external_product_id', parseInt(id, 10)).single();

      const { data, error } = await query;
      if (error && error.code !== 'PGRST116') throw new Error(`Supabase query error: ${error.message}`);
      return data || null;
    }

    for (const prod of inMemoryStore.trackedProducts.values()) {
      if (prod.id === id || String(prod.external_product_id) === String(id)) {
        return prod;
      }
    }
    return null;
  },

  /**
   * Create a new tracked product record
   */
  async createTrackedProduct(productData) {
    const newRecord = {
      id: productData.id || crypto.randomUUID(),
      external_product_id: Number(productData.external_product_id),
      product_name: productData.product_name,
      product_url: productData.product_url,
      category: productData.category || null,
      sku: productData.sku || null,
      current_price: productData.current_price ?? null,
      current_stock: productData.current_stock ?? null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .insert(newRecord)
        .select()
        .single();

      if (error) throw new Error(`Supabase insert error: ${error.message}`);
      return data;
    }

    inMemoryStore.trackedProducts.set(newRecord.id, newRecord);
    return newRecord;
  },

  /**
   * Update tracked product current price and stock (ONLY on successful scrape)
   */
  async updateProductPriceAndStock(productId, price, stock) {
    const updatedAt = new Date().toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('tracked_products')
        .update({
          current_price: price,
          current_stock: stock,
          updated_at: updatedAt,
        })
        .eq('id', productId)
        .select()
        .single();

      if (error) throw new Error(`Supabase update error: ${error.message}`);
      return data;
    }

    const prod = inMemoryStore.trackedProducts.get(productId);
    if (prod) {
      prod.current_price = price;
      prod.current_stock = stock;
      prod.updated_at = updatedAt;
      inMemoryStore.trackedProducts.set(productId, prod);
    }
    return prod;
  },

  /**
   * Insert a successful price and stock history record
   */
  async insertPriceHistory(historyData) {
    const record = {
      id: historyData.id || crypto.randomUUID(),
      tracked_product_id: historyData.tracked_product_id,
      price: historyData.price,
      stock: historyData.stock,
      scraped_at: historyData.scraped_at || new Date().toISOString(),
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('price_history')
        .insert(record)
        .select()
        .single();

      if (error) throw new Error(`Supabase history insert error: ${error.message}`);
      return data;
    }

    inMemoryStore.priceHistory.push(record);
    return record;
  },

  /**
   * Insert a scrape log attempt record (SUCCESS, RETRIED, or FAILED)
   */
  async insertScrapeLog(logData) {
    const record = {
      id: logData.id || crypto.randomUUID(),
      tracked_product_id: logData.tracked_product_id || null,
      external_product_id: Number(logData.external_product_id),
      started_at: logData.started_at,
      completed_at: logData.completed_at,
      status: logData.status, // SUCCESS, RETRIED, FAILED
      attempt_number: logData.attempt_number || 1,
      duration_ms: logData.duration_ms || 0,
      error_message: logData.error_message || null,
      extracted_price: logData.extracted_price ?? null,
      extracted_stock: logData.extracted_stock ?? null,
      metadata: logData.metadata || {},
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('scrape_logs')
        .insert(record)
        .select()
        .single();

      if (error) throw new Error(`Supabase log insert error: ${error.message}`);
      return data;
    }

    inMemoryStore.scrapeLogs.push(record);
    return record;
  },

  /**
   * Get price history timeseries for a tracked product
   */
  async getPriceHistoryByProductId(trackedProductId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('scraped_at', { ascending: true });

      if (error) throw new Error(`Supabase history query error: ${error.message}`);
      return data || [];
    }

    return inMemoryStore.priceHistory
      .filter((h) => h.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(a.scraped_at) - new Date(b.scraped_at));
  },

  /**
   * Get attempt scrape logs for a tracked product
   */
  async getScrapeLogsByProductId(trackedProductId) {
    if (supabase) {
      const { data, error } = await supabase
        .from('scrape_logs')
        .select('*')
        .eq('tracked_product_id', trackedProductId)
        .order('started_at', { ascending: false });

      if (error) throw new Error(`Supabase logs query error: ${error.message}`);
      return data || [];
    }

    return inMemoryStore.scrapeLogs
      .filter((l) => l.tracked_product_id === trackedProductId)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
  },
};
