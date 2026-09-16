const Circle = require('../models/Circle');
const User = require('../models/User');
const Post = require('../models/Post');

/**
 * Circle management. Circles are the unit of privacy, so every route here is
 * owner-only: you may only reshape an audience you own.
 */

const shape = (circle, postCount = 0) => ({
  _id: circle._id,
  name: circle.name,
  members: (circle.members || []).map((m) =>
    m.username ? { _id: m._id, username: m.username } : { _id: m }
  ),
  memberCount: (circle.members || []).length,
  postCount,
});

/** GET /api/circles — the caller's own circles, with member and post counts. */
exports.listCircles = async (req, res, next) => {
  try {
    const circles = await Circle.find({ owner: req.user.id })
      .populate('members', 'username')
      .sort({ name: 1 });

    const counts = await Post.aggregate([
      { $match: { user: req.user._id || req.user.id } },
      { $group: { _id: '$circle', n: { $sum: 1 } } },
    ]);
    const byName = new Map(counts.map((c) => [c._id, c.n]));

    res.json({ circles: circles.map((c) => shape(c, byName.get(c.name) || 0)) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/circles — create a named circle. */
exports.createCircle = async (req, res, next) => {
  try {
    const name = (req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'A circle needs a name' });

    const existing = await Circle.findOne({ owner: req.user.id, name });
    if (existing) return res.status(400).json({ error: 'You already have a circle with that name' });

    const circle = await Circle.create({ owner: req.user.id, name, members: [] });
    await User.findByIdAndUpdate(req.user.id, { $addToSet: { circles: name } });
    res.status(201).json({ circle: shape(circle) });
  } catch (error) {
    next(error);
  }
};

/** POST /api/circles/:id/members — admit someone by username. */
exports.addMember = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    if (String(circle.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can change this circle' });
    }

    const username = (req.body?.username || '').trim();
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'No such user' });
    if (String(user._id) === String(req.user.id)) {
      return res.status(400).json({ error: 'You are always in your own circles' });
    }
    if (circle.members.some((m) => String(m) === String(user._id))) {
      return res.status(400).json({ error: `${username} is already in this circle` });
    }

    circle.members.push(user._id);
    await circle.save();
    await circle.populate('members', 'username');
    res.json({ circle: shape(circle), addedUser: { _id: user._id, username: user.username } });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/circles/:id/members/:userId — revoke access. */
exports.removeMember = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    if (String(circle.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can change this circle' });
    }

    circle.members = circle.members.filter((m) => String(m) !== String(req.params.userId));
    await circle.save();
    await circle.populate('members', 'username');
    res.json({ circle: shape(circle) });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/circles/:id — delete an empty-audience circle.
 * Posts already published to it keep their label but become author-only,
 * which is the safe direction: deleting a circle never widens access.
 */
exports.deleteCircle = async (req, res, next) => {
  try {
    const circle = await Circle.findById(req.params.id);
    if (!circle) return res.status(404).json({ error: 'Circle not found' });
    if (String(circle.owner) !== String(req.user.id)) {
      return res.status(403).json({ error: 'Only the owner can delete this circle' });
    }

    await circle.deleteOne();
    await User.findByIdAndUpdate(req.user.id, { $pull: { circles: circle.name } });
    res.json({ message: 'Circle deleted' });
  } catch (error) {
    next(error);
  }
};
