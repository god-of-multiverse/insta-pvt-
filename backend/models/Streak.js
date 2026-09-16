const mongoose = require('mongoose');

/** Snapchat-style streak between exactly two users (pair key is sorted). */
const streakSchema = new mongoose.Schema({
  pairKey: { type: String, required: true, unique: true, index: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  count: { type: Number, default: 0 },
  lastInteraction: { type: Date, default: Date.now },
});

streakSchema.statics.keyFor = (a, b) => [String(a), String(b)].sort().join(':');

module.exports = mongoose.model('Streak', streakSchema);
