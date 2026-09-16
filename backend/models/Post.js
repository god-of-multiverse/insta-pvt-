const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: { type: String, required: true },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  image: { type: String, required: true },
  images: { type: [String], default: [] },
  mediaType: { type: String, enum: ['image', 'video'], default: 'image' },
  caption: { type: String, default: '' },
  circle: { type: String, default: 'General' },
  location: { type: String, default: '' },
  hashtags: { type: [String], default: [], index: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema],

  archived: { type: Boolean, default: false },
  commentsDisabled: { type: Boolean, default: false },
  hideLikeCount: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Post', postSchema);
