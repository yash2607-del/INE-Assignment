const API_BASE_URL = '/api';

/**
 * Fetch wrapper handling JSON parsing and error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.message || `API request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Check API health
  getHealth: () => request('/health'),

  // Product Search
  searchProducts: (query) => request(`/products/search?q=${encodeURIComponent(query)}`),

  // Tracked Products
  getTrackedProducts: () => request('/tracked-products'),
  getTrackedProductById: (id) => request(`/tracked-products/${id}`),
  trackProduct: (externalProductId) =>
    request('/tracked-products', {
      method: 'POST',
      body: JSON.stringify({ externalProductId }),
    }),

  // Manual Scrape Trigger
  triggerScrape: (id, options = {}) =>
    request(`/tracked-products/${id}/scrape`, {
      method: 'POST',
      body: JSON.stringify(options),
    }),

  // Price History & Logs
  getPriceHistory: (id) => request(`/tracked-products/${id}/history`),
  getScrapeLogs: (id) => request(`/tracked-products/${id}/scrape-logs`),
};
