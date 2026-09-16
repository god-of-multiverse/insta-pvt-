const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET = process.env.JWT_SECRET || 'my_secret_key';

/** Verifies the bearer token and loads the user onto req.user. */
/**
 * Extracts the bearer token, tolerating proxies that consume the standard
 * Authorization header. Falls back to X-Auth-Token, then a `token` query
 * param, so the client can always get credentials through.
 */
function readToken(req) {
  const header = req.header('Authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  const alt = req.header('X-Auth-Token') || req.header('x-auth-token');
  if (alt) return alt.trim();
  if (req.query && typeof req.query.token === 'string') return req.query.token.trim();
  return '';
}

const auth = async (req, res, next) => {
  try {
    const token = readToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    if (user.isBanned) {
      return res.status(403).json({ error: user.banReason || 'This account has been suspended.' });
    }

    // Presence, throttled so we don't write on every single request
    if (!user.lastSeen || Date.now() - user.lastSeen.getTime() > 60_000) {
      user.lastSeen = new Date();
      await user.save();
    }

    req.user = { id: String(user._id), ...user.toObject() };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
};

/** Attaches req.user when a token is present, but never rejects. */
auth.optional = async (req, res, next) => {
  const token = readToken(req);
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user && !user.isBanned) req.user = { id: String(user._id), ...user.toObject() };
  } catch {
    /* ignore — treated as anonymous */
  }
  next();
};

/** Requires an admin (or moderator, when allowModerator is true). */
auth.admin = (allowModerator = false) => (req, res, next) => {
  const roles = allowModerator ? ['admin', 'moderator'] : ['admin'];
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

module.exports = auth;
