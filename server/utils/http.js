// Wrap async route handlers so thrown errors become clean JSON responses.
export function asyncHandler(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      const status = err.response?.status || 500;
      const detail = err.response?.data?.detail || err.message || 'upstream error';
      res.status(status).json({ error: detail });
    });
  };
}

// Pull the end-user's bearer token out of the incoming request.
export function getBearer(req) {
  return req.headers.authorization || '';
}
