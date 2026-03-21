const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler]', err);

  const status = err.status || err.statusCode || 500;

  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(status).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
    },
  });
};

module.exports = errorHandler;
