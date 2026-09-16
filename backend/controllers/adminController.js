const User = require('../models/User');
const Post = require('../models/Post');
const Story = require('../models/Story');
const Message = require('../models/Message');

/** Monthly price per plan, in whole currency units. Drives revenue figures. */
const PLAN_PRICE = { free: 0, plus: 199, pro: 499 };

const startOfDay = (offsetDays = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offsetDays);
  return d;
};

/**
 * GET /api/admin/stats
 * Headline numbers for the admin dashboard: users, growth, engagement and
 * subscription revenue.
 */
exports.getStats = async (req, res, next) => {
  try {
    const today = startOfDay();
    const weekAgo = startOfDay(7);
    const monthAgo = startOfDay(30);

    const [
      totalUsers,
      newToday,
      newThisWeek,
      activeToday,
      activeThisWeek,
      bannedUsers,
      totalPosts,
      postsToday,
      totalStories,
      totalMessages,
      planRows,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: weekAgo } }),
      User.countDocuments({ lastSeen: { $gte: today } }),
      User.countDocuments({ lastSeen: { $gte: weekAgo } }),
      User.countDocuments({ isBanned: true }),
      Post.countDocuments(),
      Post.countDocuments({ createdAt: { $gte: today } }),
      Story.countDocuments({ expiresAt: { $gt: new Date() } }),
      Message.countDocuments(),
      User.aggregate([{ $group: { _id: '$plan', count: { $sum: 1 } } }]),
    ]);

    const plans = { free: 0, plus: 0, pro: 0 };
    planRows.forEach((row) => {
      plans[row._id || 'free'] = row.count;
    });

    const mrr = Object.entries(plans).reduce(
      (sum, [plan, count]) => sum + (PLAN_PRICE[plan] || 0) * count,
      0
    );
    const paying = plans.plus + plans.pro;

    // 14-day signup sparkline
    const growth = [];
    for (let i = 13; i >= 0; i -= 1) {
      const from = startOfDay(i);
      const to = startOfDay(i - 1);
      // eslint-disable-next-line no-await-in-loop
      const count = await User.countDocuments({ createdAt: { $gte: from, $lt: to } });
      growth.push({ date: from.toISOString().slice(0, 10), count });
    }

    res.json({
      users: {
        total: totalUsers,
        newToday,
        newThisWeek,
        activeToday,
        activeThisWeek,
        banned: bannedUsers,
      },
      content: { posts: totalPosts, postsToday, activeStories: totalStories, messages: totalMessages },
      monetisation: {
        plans,
        paying,
        conversionRate: totalUsers ? Number(((paying / totalUsers) * 100).toFixed(1)) : 0,
        mrr,
        arr: mrr * 12,
        arpu: totalUsers ? Number((mrr / totalUsers).toFixed(2)) : 0,
        prices: PLAN_PRICE,
      },
      growth,
      generatedAt: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/users — paginated directory with search and filters. */
exports.listUsers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);
    const { q, plan, role, banned } = req.query;

    const filter = {};
    if (q) filter.username = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (plan) filter.plan = plan;
    if (role) filter.role = role;
    if (banned === 'true') filter.isBanned = true;

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username email role plan isBanned isVerified createdAt lastSeen')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    // Attach each user's post count in one aggregate rather than N queries
    const ids = users.map((u) => u._id);
    const counts = await Post.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]);
    const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

    res.json({
      users: users.map((u) => ({ ...u.toObject(), postCount: countMap.get(String(u._id)) || 0 })),
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/admin/users/:id — change role, plan, verification or ban state. */
exports.updateUser = async (req, res, next) => {
  try {
    const { role, plan, isBanned, banReason, isVerified } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Guard: never let the last admin demote or ban themselves out of access
    const losingAdmin =
      user.role === 'admin' && ((role && role !== 'admin') || isBanned === true);
    if (losingAdmin) {
      const admins = await User.countDocuments({ role: 'admin', isBanned: false });
      if (admins <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last remaining admin.' });
      }
    }

    if (role !== undefined) user.role = role;
    if (plan !== undefined) {
      user.plan = plan;
      user.planSince = plan === 'free' ? null : new Date();
    }
    if (isVerified !== undefined) user.isVerified = isVerified;
    if (isBanned !== undefined) {
      user.isBanned = isBanned;
      user.banReason = isBanned ? banReason || 'Violated community guidelines' : '';
    }

    await user.save();
    const { password, ...safe } = user.toObject();
    res.json({ user: safe });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/users/:id — remove a user and everything they created. */
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account here.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    await Promise.all([
      Post.deleteMany({ user: user._id }),
      Story.deleteMany({ user: user._id }),
      Message.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] }),
      User.deleteOne({ _id: user._id }),
    ]);

    res.json({ message: 'User and their content removed' });
  } catch (error) {
    next(error);
  }
};

/** GET /api/admin/posts — content moderation queue. */
exports.listPosts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(60, parseInt(req.query.limit, 10) || 24);

    const [posts, total] = await Promise.all([
      Post.find()
        .populate('user', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Post.countDocuments(),
    ]);

    res.json({ posts, total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/admin/posts/:id — take down any post. */
exports.deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    await Post.deleteOne({ _id: post._id });
    res.json({ message: 'Post removed' });
  } catch (error) {
    next(error);
  }
};
