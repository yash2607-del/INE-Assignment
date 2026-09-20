import React, { useState } from 'react';
import { RefreshCw, ExternalLink, LineChart, Loader2, PackageCheck } from 'lucide-react';
import { api } from '../lib/api';

export function TrackedProductsList({ products, onSelectProduct, onRefreshNeeded }) {
  const [scrapingId, setScrapingId] = useState(null);

  const handleManualScrape = async (e, productId) => {
    e.stopPropagation();
    setScrapingId(productId);
    try {
      await api.triggerScrape(productId);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      alert(`Manual scrape failed: ${err.message}`);
    } finally {
      setScrapingId(null);
    }
  };

  if (!products || products.length === 0) {
    return (
      <div className="search-section" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <PackageCheck size={48} color="var(--text-dim)" style={{ marginBottom: '16px' }} />
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No Tracked Products Yet</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Use the search bar above to search for products on the INE store and start tracking them.
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="section-header">
        <h2 className="section-title">
          <PackageCheck size={20} color="var(--accent-primary)" /> Tracked Products ({products.length})
        </h2>
      </div>

      <div className="products-grid">
        {products.map((prod) => {
          const formattedPrice = prod.current_price !== null && prod.current_price !== undefined
            ? `₹${Number(prod.current_price).toLocaleString('en-IN')}`
            : 'Price Pending';

          const inStock = prod.current_stock > 0;
          const lastUpdated = prod.updated_at
            ? new Date(prod.updated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            : 'Never';

          return (
            <div
              key={prod.id}
              className="product-card"
              onClick={() => onSelectProduct(prod)}
              style={{ cursor: 'pointer' }}
            >
              <div className="product-card-header">
                <div>
                  <h3 className="product-name">{prod.product_name}</h3>
                  <p className="product-sku">SKU: {prod.sku || `ID-${prod.external_product_id}`}</p>
                </div>
                <a
                  href={prod.product_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  title="Open live storefront page"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ExternalLink size={16} />
                </a>
              </div>

              <div className="price-stock-display">
                <div className="current-price">{formattedPrice}</div>
                <span className={`stock-pill ${inStock ? 'stock-in' : 'stock-out'}`}>
                  {prod.current_stock !== null && prod.current_stock !== undefined
                    ? inStock
                      ? `${prod.current_stock} in stock`
                      : 'Out of stock'
                    : 'Unscraped'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  Scraped: {lastUpdated}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={(e) => handleManualScrape(e, prod.id)}
                    disabled={scrapingId === prod.id}
                    title="Scrape current price now"
                  >
                    {scrapingId === prod.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <>
                        <RefreshCw size={14} /> Scrape Now
                      </>
                    )}
                  </button>

                  <button className="btn btn-primary btn-sm">
                    <LineChart size={14} /> Details & History
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
