import React from 'react';
import { History, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

export function ScrapeLogTable({ logs }) {
  if (!logs || logs.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
        No scrape attempt logs recorded yet.
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span className="badge-status badge-SUCCESS" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={12} /> SUCCESS
          </span>
        );
      case 'RETRIED':
        return (
          <span className="badge-status badge-RETRIED" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <AlertTriangle size={12} /> RETRIED
          </span>
        );
      case 'FAILED':
      default:
        return (
          <span className="badge-status badge-FAILED" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={12} /> FAILED
          </span>
        );
    }
  };

  return (
    <div>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '24px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <History size={16} /> Scrape Attempt Logs 
      </h4>

      <table className="logs-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Attempt</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Extracted Price</th>
            <th>Extracted Stock</th>
            <th>Error / Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td style={{ fontFamily: 'var(--font-mono)' }}>
                {new Date(log.started_at).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </td>
              <td style={{ fontFamily: 'var(--font-mono)' }}>#{log.attempt_number || 1}</td>
              <td>{getStatusBadge(log.status)}</td>
              <td style={{ color: 'var(--text-muted)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  <Clock size={12} /> {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                </span>
              </td>
              <td style={{ fontWeight: 600 }}>
                {log.extracted_price !== null && log.extracted_price !== undefined
                  ? `₹${Number(log.extracted_price).toLocaleString('en-IN')}`
                  : '-'}
              </td>
              <td>
                {log.extracted_stock !== null && log.extracted_stock !== undefined
                  ? `${log.extracted_stock} units`
                  : '-'}
              </td>
              <td style={{ color: log.error_message ? 'var(--status-failed-text)' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                {log.error_message || 'OK'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
