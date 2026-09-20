import React, { useState, useEffect } from 'react';
import { Search, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

export function ProductSearch({ onProductTracked }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState(null);
  const [error, setError] = useState(null);

  // Debounced Search Effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      api
        .searchProducts(query)
        .then((res) => {
          setResults(res.items || []);
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleTrackProduct = async (product) => {
    setTrackingId(product.id);
    try {
      await api.trackProduct(product.id);
      if (onProductTracked) onProductTracked();
    } catch (err) {
      alert(`Failed to track product: ${err.message}`);
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <section className="search-section">
      <div className="section-header">
        <h2 className="section-title">
          <Search size={20} className="text-accent" /> Find Products to Track
        </h2>
      </div>

      <div className="search-input-wrapper">
        <Search className="search-icon" size={20} />
        <input
          type="text"
          className="search-input"
          placeholder="Search INE mock store by product name, SKU, or category (e.g. 'ironwood', 'toaster', 'laptop')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', color: 'var(--text-muted)' }}>
          <Loader2 size={16} className="spin" /> Searching store catalog...
        </div>
      )}

      {error && <div style={{ color: 'var(--status-failed-text)', marginTop: '16px' }}>Search error: {error}</div>}

      {!loading && query.trim() && results.length === 0 && (
        <div style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No products found matching "{query}".
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results-grid">
          {results.map((prod) => (
            <div key={prod.id} className="search-result-card">
              <div>
                <span className="stock-pill stock-in" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                  {prod.category}
                </span>
                <h3 className="search-result-title" style={{ marginTop: '6px' }}>
                  {prod.name}
                </h3>
                <p className="search-result-meta">SKU: {prod.sku || `INE-${prod.id}`}</p>
              </div>

              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleTrackProduct(prod)}
                disabled={trackingId === prod.id}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {trackingId === prod.id ? (
                  <>
                    <Loader2 size={14} className="spin" /> Tracking...
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Track Product
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
