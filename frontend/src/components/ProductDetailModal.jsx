import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { PriceHistoryChart } from './PriceHistoryChart';
import { ScrapeLogTable } from './ScrapeLogTable';

export function ProductDetailModal({ product, onClose, onRefreshProduct }) {
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [historyRes, logsRes] = await Promise.all([
        api.getPriceHistory(product.id),
        api.getScrapeLogs(product.id),
      ]);
      setHistory(historyRes.items || []);
      setLogs(logsRes.items || []);
    } catch (err) {
      console.error('Error fetching detail data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (product) {
      fetchData();
    }
  }, [product]);

  const handleManualScrape = async () => {
    setScraping(true);
    try {
      await api.triggerScrape(product.id);
      await fetchData();
      if (onRefreshProduct) onRefreshProduct();
    } catch (err) {
      alert(`Scrape failed: ${err.message}`);
    } finally {
      setScraping(false);
    }
  };

  if (!product) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span className="stock-pill stock-in" style={{ fontSize: '0.7rem' }}>
              {product.category || 'General'}
            </span>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '6px' }}>{product.product_name}</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
              SKU: {product.sku || `ID-${product.external_product_id}`} | External ID: #{product.external_product_id}
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '50%', width: '36px', height: '36px', padding: 0 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Price & Stock Overview Banner */}
        <div
          style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Current Tracked Price</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-secondary)' }}>
              {product.current_price !== null && product.current_price !== undefined
                ? `₹${Number(product.current_price).toLocaleString('en-IN')}`
                : 'Not Scraped Yet'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Status</div>
            <span className={`stock-pill ${product.current_stock > 0 ? 'stock-in' : 'stock-out'}`}>
              {product.current_stock !== null && product.current_stock !== undefined
                ? `${product.current_stock} units available`
                : 'Unknown'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-primary" onClick={handleManualScrape} disabled={scraping}>
              {scraping ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
              {scraping ? 'Scraping...' : 'Trigger Scrape Now'}
            </button>

            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              <ExternalLink size={16} /> Live Store Page
            </a>
          </div>
        </div>

        {/* Content Tabs / Sections */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="spin" style={{ marginBottom: '8px' }} />
            <div>Loading price history and scrape logs...</div>
          </div>
        ) : (
          <div>
            <PriceHistoryChart history={history} />
            <ScrapeLogTable logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
}
