const errorHandler = (err, req, res, next) => {
  console.error(`❌ Error details:`, err);

  // Multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: messages.join(', ') });
  }

  // Mongoose duplicate key errors
  if (err.code && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token. Please login again.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired. Please login again.' });
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error'
  });
};

module.exports = errorHandler;
