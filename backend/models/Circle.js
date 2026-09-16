const mongoose = require('mongoose');

/**
 * A named, private audience owned by one user.
 *
 * Circles used to exist only as free-text strings on User.circles and
 * Post.circle, which meant the server had no way to answer "is this person
 * allowed to read this circle?" — the client simply named a circle and the
 * API handed over the posts. This model makes membership explicit and
 * server-owned, so visibility can actually be enforced.
 *
 * The owner is always an implicit member; `members` lists everyone else they
 * have let in.
 */
const circleSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

// One circle of a given name per owner.
circleSchema.index({ owner: 1, name: 1 }, { unique: true });

/** True when `userId` owns this circle or has been admitted to it. */
circleSchema.methods.allows = function allows(userId) {
  const id = String(userId);
  if (String(this.owner) === id) return true;
  return this.members.some((member) => String(member) === id);
};

/**
 * Every circle `userId` may read from: the ones they own, plus the ones they
 * have been admitted to. Returned as {owner, name} pairs so a post query can
 * match on the author/circle-name combination the Post schema already stores.
 */
circleSchema.statics.visibleTo = async function visibleTo(userId) {
  return this.find({ $or: [{ owner: userId }, { members: userId }] })
    .select('owner name')
    .lean();
};

/** Ensures a circle exists for this owner/name, without clobbering members. */
circleSchema.statics.ensure = async function ensure(owner, name) {
  const doc = await this.findOneAndUpdate(
    { owner, name },
    { $setOnInsert: { owner, name, members: [] } },
    { new: true, upsert: true }
  );
  return doc;
};

module.exports = mongoose.model('Circle', circleSchema);
