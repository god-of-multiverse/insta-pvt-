const Story = require('../models/Story');
const User = require('../models/User');
const { notify } = require('./socialController');

/** POST /api/stories — upload a story/snap (expires in 24h). */
exports.createStory = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No media uploaded' });

    const story = await Story.create({
      user: req.user.id,
      media: `/uploads/${req.file.filename}`,
      mediaType: req.file.mimetype.startsWith('video') ? 'video' : 'image',
      caption: req.body.caption || '',
      circle: req.body.circle || 'General',
      disappearing: req.body.disappearing === 'true' || req.body.disappearing === true,
    });

    await story.populate('user', 'username profilePicture');
    res.status(201).json({ story });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/stories — active stories grouped by author, so the client can render
 * the familiar row of rings at the top of the feed.
 */
exports.getStories = async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id);
    const audience = [...(me.following || []).map(String), req.user.id];

    const stories = await Story.find({
      user: { $in: audience },
      expiresAt: { $gt: new Date() },
    })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: 1 });

    const grouped = new Map();
    stories.forEach((story) => {
      const key = String(story.user._id);
      if (!grouped.has(key)) {
        grouped.set(key, { user: story.user, stories: [], hasUnseen: false });
      }
      const seen = story.viewers.some((v) => String(v.user) === req.user.id);
      const entry = grouped.get(key);
      entry.stories.push({
        _id: story._id,
        media: story.media,
        mediaType: story.mediaType,
        caption: story.caption,
        disappearing: story.disappearing,
        createdAt: story.createdAt,
        seen,
        viewerCount: story.viewers.length,
      });
      if (!seen) entry.hasUnseen = true;
    });

    // Your own tray first, then anyone with unseen content
    const trays = [...grouped.values()].sort((a, b) => {
      if (String(a.user._id) === req.user.id) return -1;
      if (String(b.user._id) === req.user.id) return 1;
      return Number(b.hasUnseen) - Number(a.hasUnseen);
    });

    res.json({ trays });
  } catch (error) {
    next(error);
  }
};

/** POST /api/stories/:id/view — mark seen; destroys one-view snaps. */
exports.viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const already = story.viewers.some((v) => String(v.user) === req.user.id);
    if (!already) {
      story.viewers.push({ user: req.user.id, screenshotted: false });
      await story.save();
      await notify({
        recipient: story.user,
        actor: req.user.id,
        type: 'story_view',
        text: 'viewed your story',
      });
    }

    // A disappearing snap is destroyed once a non-author opens it
    if (story.disappearing && String(story.user) !== req.user.id) {
      await Story.deleteOne({ _id: story._id });
      return res.json({ consumed: true });
    }

    res.json({ consumed: false, viewerCount: story.viewers.length });
  } catch (error) {
    next(error);
  }
};

/** POST /api/stories/:id/screenshot — Snapchat-style screenshot alert. */
exports.reportScreenshot = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const viewer = story.viewers.find((v) => String(v.user) === req.user.id);
    if (viewer) viewer.screenshotted = true;
    else story.viewers.push({ user: req.user.id, screenshotted: true });
    await story.save();

    await notify({
      recipient: story.user,
      actor: req.user.id,
      type: 'system',
      text: 'took a screenshot of your story',
    });

    res.json({ message: 'Author notified' });
  } catch (error) {
    next(error);
  }
};

/** GET /api/stories/:id/viewers — author-only viewer list. */
exports.getViewers = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id).populate('viewers.user', 'username');
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (String(story.user) !== req.user.id) {
      return res.status(403).json({ error: 'Only the author can see viewers' });
    }
    res.json({ viewers: story.viewers });
  } catch (error) {
    next(error);
  }
};

exports.deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: 'Story not found' });
    if (String(story.user) !== req.user.id && req.user.role === 'user') {
      return res.status(403).json({ error: 'Not authorised' });
    }
    await Story.deleteOne({ _id: story._id });
    res.json({ message: 'Story deleted' });
  } catch (error) {
    next(error);
  }
};
