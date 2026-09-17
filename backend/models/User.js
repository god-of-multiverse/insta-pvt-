const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, minlength: 3 },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, minlength: 6 },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  isPrivate: { type: Boolean, default: true },

  // ---- Roles & moderation -------------------------------------------------
  role: { type: String, enum: ['user', 'moderator', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: '' },

  // ---- Monetisation -------------------------------------------------------
  plan: { type: String, enum: ['free', 'plus', 'pro'], default: 'free' },
  planSince: { type: Date, default: null },

  // ---- Social graph -------------------------------------------------------
  circles: { type: [String], default: ['General', 'Hometown', 'College'] },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  closeFriends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // ---- Presence -----------------------------------------------------------
  hideLastSeen: { type: Boolean, default: false },
  hideStoryFromStrangers: { type: Boolean, default: false },
  allowMentions: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },

  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
