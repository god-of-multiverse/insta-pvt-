const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');

const notify = async ({ recipient, actor, type, post, text }) => {
  if (String(recipient) === String(actor)) return; // never notify yourself
  await Notification.create({ recipient, actor, type, post, text });
};

/* -------------------------------------------------------------- likes ---- */

exports.toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userId = req.user.id;
    const index = post.likes.findIndex((id) => String(id) === userId);
    const liked = index === -1;

    if (liked) post.likes.push(userId);
    else post.likes.splice(index, 1);
    await post.save();

    if (liked) await notify({ recipient: post.user, actor: userId, type: 'like', post: post._id });

    res.json({ liked, likesCount: post.likes.length });
  } catch (error) {
    next(error);
  }
};

/* ----------------------------------------------------------- comments ---- */

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'Comment text is required' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (post.commentsDisabled) return res.status(403).json({ error: 'Comments are turned off' });

    post.comments.push({ user: req.user.id, text: text.trim() });
    await post.save();
    await post.populate('comments.user', 'username profilePicture');

    const comment = post.comments[post.comments.length - 1];
    await notify({
      recipient: post.user,
      actor: req.user.id,
      type: 'comment',
      post: post._id,
      text: text.trim().slice(0, 80),
    });

    res.status(201).json({ comment, commentsCount: post.comments.length });
  } catch (error) {
    next(error);
  }
};

exports.deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });

    const isOwner = String(comment.user) === req.user.id || String(post.user) === req.user.id;
    if (!isOwner && req.user.role === 'user') {
      return res.status(403).json({ error: 'Not authorised' });
    }

    comment.deleteOne();
    await post.save();
    res.json({ message: 'Comment deleted', commentsCount: post.comments.length });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------- follow ---- */

exports.toggleFollow = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (targetId === req.user.id) return res.status(400).json({ error: 'You cannot follow yourself' });

    const [me, target] = await Promise.all([User.findById(req.user.id), User.findById(targetId)]);
    if (!target) return res.status(404).json({ error: 'User not found' });

    const index = me.following.findIndex((id) => String(id) === targetId);
    const following = index === -1;

    if (following) {
      me.following.push(targetId);
      target.followers.push(me._id);
    } else {
      me.following.splice(index, 1);
      target.followers = target.followers.filter((id) => String(id) !== req.user.id);
    }

    await Promise.all([me.save(), target.save()]);
    if (following) await notify({ recipient: targetId, actor: req.user.id, type: 'follow' });

    res.json({ following, followersCount: target.followers.length });
  } catch (error) {
    next(error);
  }
};

/* --------------------------------------------------------------- save ---- */

exports.toggleSave = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    const postId = req.params.id;
    const index = me.savedPosts.findIndex((id) => String(id) === postId);
    const saved = index === -1;

    if (saved) me.savedPosts.push(postId);
    else me.savedPosts.splice(index, 1);
    await me.save();

    res.json({ saved });
  } catch (error) {
    next(error);
  }
};

exports.getSaved = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).populate({
      path: 'savedPosts',
      populate: { path: 'user', select: 'username profilePicture' },
    });
    res.json(me.savedPosts || []);
  } catch (error) {
    next(error);
  }
};

/* -------------------------------------------------------------- block ---- */

exports.toggleBlock = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    const targetId = req.params.userId;
    const index = me.blocked.findIndex((id) => String(id) === targetId);
    const blocked = index === -1;

    if (blocked) {
      me.blocked.push(targetId);
      me.following = me.following.filter((id) => String(id) !== targetId);
    } else {
      me.blocked.splice(index, 1);
    }
    await me.save();
    res.json({ blocked });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------- notifications --- */

exports.getNotifications = async (req, res, next) => {
  try {
    const items = await Notification.find({ recipient: req.user.id })
      .populate('actor', 'username profilePicture')
      .populate('post', 'image')
      .sort({ createdAt: -1 })
      .limit(60);
    const unread = items.filter((n) => !n.read).length;
    res.json({ notifications: items, unread });
  } catch (error) {
    next(error);
  }
};

exports.markNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, read: false }, { read: true });
    res.json({ message: 'All caught up' });
  } catch (error) {
    next(error);
  }
};

/* ------------------------------------------------------------- search ---- */

exports.search = async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [], posts: [], hashtags: [] });

    const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(safe, 'i');

    const [users, posts] = await Promise.all([
      User.find({ username: rx, isBanned: false }).select('username bio profilePicture isVerified').limit(20),
      Post.find({ $or: [{ caption: rx }, { hashtags: q.replace(/^#/, '').toLowerCase() }], archived: false })
        .populate('user', 'username profilePicture')
        .sort({ createdAt: -1 })
        .limit(20),
    ]);

    const tags = await Post.aggregate([
      { $unwind: '$hashtags' },
      { $match: { hashtags: rx } },
      { $group: { _id: '$hashtags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({ users, posts, hashtags: tags.map((t) => ({ tag: t._id, count: t.count })) });
  } catch (error) {
    next(error);
  }
};

exports.notify = notify;
