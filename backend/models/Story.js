const mongoose = require('mongoose');

/**
 * Stories / Snaps.
 * `expiresAt` drives a TTL index so Mongo removes them automatically after 24h.
 * `disappearing` marks Snapchat-style one-view media that is destroyed after
 * every recipient has opened it.
 */
const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: { type: String, required: true },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, default: '' },
  circle: { type: String, default: 'General' },

  disappearing: { type: Boolean, default: false },
  viewers: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      viewedAt: { type: Date, default: Date.now },
      screenshotted: { type: Boolean, default: false },
    },
  ],

  createdAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 },
  },
});

module.exports = mongoose.model('Story', storySchema);
