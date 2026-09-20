/**
 * Centralized Express Error Handling Middleware.
 * Prevents exposing internal stack traces or database credentials to clients.
 */
export function errorHandler(err, req, res, next) {
  console.error('[API ERROR]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: err.name || 'APIError',
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
