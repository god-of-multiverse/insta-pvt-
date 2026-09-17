const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

const KEYS = ['isPrivate', 'hideLastSeen', 'hideStoryFromStrangers', 'allowMentions'];

const shape = (u) => ({
  isPrivate: !!u.isPrivate,
  hideLastSeen: !!u.hideLastSeen,
  hideStoryFromStrangers: !!u.hideStoryFromStrangers,
  allowMentions: u.allowMentions !== false,
});

/** GET /api/privacy — current settings plus the block list. */
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('blocked', 'username');
    res.json({ settings: shape(user), blocked: user.blocked || [] });
  } catch (error) {
    next(error);
  }
});

/** PATCH /api/privacy — update any subset of the boolean settings. */
router.patch('/', auth, async (req, res, next) => {
  try {
    const update = {};
    KEYS.forEach((k) => {
      if (typeof req.body?.[k] === 'boolean') update[k] = req.body[k];
    });
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true });
    res.json({ settings: shape(user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
