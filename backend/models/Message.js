const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, default: '' },
  media: { type: String, default: '' },

  // Snapchat-style ephemeral messages
  disappearing: { type: Boolean, default: false },
  viewedAt: { type: Date, default: null },

  readAt: { type: Date, default: null },
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      emoji: String,
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
