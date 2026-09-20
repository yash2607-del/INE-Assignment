import React from 'react';
import { Calendar, TrendingUp } from 'lucide-react';

export function PriceHistoryChart({ history }) {
  if (!history || history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
        No price history recorded yet. Trigger a scrape to record history.
      </div>
    );
  }

  // Calculate SVG price trend points
  const prices = history.map((h) => Number(h.price));
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const chartWidth = 700;
  const chartHeight = 160;
  const padding = 20;

  const points = history
    .map((h, i) => {
      const x = padding + (i / Math.max(history.length - 1, 1)) * (chartWidth - padding * 2);
      const normalizedPrice = (Number(h.price) - minPrice) / priceRange;
      const y = chartHeight - padding - normalizedPrice * (chartHeight - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <TrendingUp size={16} color="var(--accent-secondary)" /> Price Trend Visualization
        </h4>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Min: ₹{minPrice.toLocaleString('en-IN')} | Max: ₹{maxPrice.toLocaleString('en-IN')}
        </div>
      </div>

      <div className="chart-container">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Subtle Grid Lines */}
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1={padding} y1={chartHeight / 2} x2={chartWidth - padding} y2={chartHeight / 2} stroke="var(--border-subtle)" strokeDasharray="4 4" />
          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="var(--border-subtle)" />

          {/* Polyline path */}
          {history.length > 1 ? (
            <polyline
              fill="none"
              stroke="var(--accent-secondary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          ) : (
            <circle cx={chartWidth / 2} cy={chartHeight / 2} r="6" fill="var(--accent-secondary)" />
          )}

          {/* Data Circles */}
          {history.map((h, i) => {
            const x = padding + (i / Math.max(history.length - 1, 1)) * (chartWidth - padding * 2);
            const normalizedPrice = (Number(h.price) - minPrice) / priceRange;
            const y = history.length > 1 ? chartHeight - padding - normalizedPrice * (chartHeight - padding * 2) : chartHeight / 2;
            return (
              <circle key={h.id || i} cx={x} cy={y} r="4" fill="#ffffff" stroke="var(--accent-secondary)" strokeWidth="2">
                <title>{`₹${Number(h.price).toLocaleString('en-IN')} (${new Date(h.scraped_at).toLocaleString()})`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Calendar size={16} /> Price & Stock History Log
      </h4>

      <table className="history-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Recorded Price</th>
            <th>Stock Level</th>
          </tr>
        </thead>
        <tbody>
          {history.slice().reverse().map((item) => (
            <tr key={item.id}>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(item.scraped_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </td>
              <td style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>
                ₹{Number(item.price).toLocaleString('en-IN')}
              </td>
              <td>
                <span className={`stock-pill ${item.stock > 0 ? 'stock-in' : 'stock-out'}`} style={{ fontSize: '0.7rem' }}>
                  {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
