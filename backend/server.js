const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const messageRoutes = require('./routes/messages');
const groupRoutes = require('./routes/groups');
const groupMessageRoutes = require('./routes/groupMessages');
const errorHandler = require('./middleware/errorHandler');

// Initialize database connection (skipped when another entrypoint owns the connection,
// e.g. dev-server.js which can fall back to an in-memory MongoDB)
if (require.main === module) {
  connectDB();
}

const app = express();

// Security Middleware
app.use(helmet({
  // Disable crossOriginResourcePolicy so images can be served to client app origins
  crossOriginResourcePolicy: false,
}));

// CORS configuration
app.use(cors());

// Request Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logging
app.use(morgan('dev'));

// Serve static upload folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/group-messages', groupMessageRoutes);

// Health Check
app.get('/', (req, res) => {
  res.json({ message: 'Instagram Clone API is running! 🚀' });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    console.log(`✅ Static uploads served at http://localhost:${PORT}/uploads`);
  });
}

module.exports = app;
