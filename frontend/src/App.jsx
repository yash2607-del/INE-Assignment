import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ProductSearch } from './components/ProductSearch';
import { TrackedProductsList } from './components/TrackedProductsList';
import { ProductDetailModal } from './components/ProductDetailModal';
import { api } from './lib/api';

export default function App() {
  const [trackedProducts, setTrackedProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [apiHealth, setApiHealth] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch tracked products list
  const fetchTrackedProducts = useCallback(async () => {
    try {
      const res = await api.getTrackedProducts();
      setTrackedProducts(res.items || []);
    } catch (err) {
      console.error('Error fetching tracked products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check system health on mount
  useEffect(() => {
    api
      .getHealth()
      .then(() => setApiHealth(true))
      .catch(() => setApiHealth(false));

    fetchTrackedProducts();
  }, [fetchTrackedProducts]);

  return (
    <div className="app-container">
      <Header apiHealth={apiHealth} onRefreshAll={fetchTrackedProducts} />

      <main>
        {/* Search Bar Section */}
        <ProductSearch onProductTracked={fetchTrackedProducts} />

        {/* Tracked Products Cards Section */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading tracked products...
          </div>
        ) : (
          <TrackedProductsList
            products={trackedProducts}
            onSelectProduct={setSelectedProduct}
            onRefreshNeeded={fetchTrackedProducts}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onRefreshProduct={fetchTrackedProducts}
        />
      )}
    </div>
  );
}
