/**
 * Offline demo API.
 *
 * Same routes and payload shapes as the real Express + MongoDB backend, but all
 * state lives in a JSON file on disk. Useful when MongoDB Atlas is unreachable
 * (e.g. the machine's IP is not whitelisted) and you just want to click through
 * the UI.
 *
 *   npm run dev:mock
 *
 * Auth uses real signed JWTs and the data file persists across restarts, so a
 * server restart never logs you out.
 *
 * Seeded accounts:
 *   admin@inasta.app / password123   (role: admin)
 *   ada@inasta.app   / password123
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Request log. Set QUIET=1 to silence. Showing whether a call carried a token
// makes auth problems obvious at a glance instead of guessable.
if (!process.env.QUIET) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      const hdr = req.header('Authorization') || '';
      const tag = hdr.startsWith('Bearer ') ? 'auth' : 'NO-TOKEN';
      console.log(`→ ${req.method} ${req.path} [${tag}]`);
    }
    next();
  });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

const SECRET = process.env.JWT_SECRET || 'mock_dev_secret';
const DATA_FILE = path.join(__dirname, '.mock-data.json');

const id = () => crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();

/* ----------------------------------------------------------- persistence -- */

let db = {
  users: [],
  posts: [],
  messages: [],
  groups: [],
  groupMessages: [],
  stories: [],
  notifications: [],
};

const save = () => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (error) {
    console.warn('Could not persist mock data:', error.message);
  }
};

const load = () => {
  if (!fs.existsSync(DATA_FILE)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    db = { stories: [], notifications: [], ...parsed };
    return Array.isArray(db.users) && db.users.length > 0;
  } catch {
    return false;
  }
};

function seed() {
  const mk = (username, email, role = 'user', plan = 'free', bio = '') => ({
    _id: id(),
    username,
    email,
    password: 'password123',
    role,
    plan,
    bio,
    isBanned: false,
    isVerified: role === 'admin',
    following: [],
    followers: [],
    savedPosts: [],
    blocked: [],
    circles: ['General', 'Hometown', 'College'],
    createdAt: now(),
    lastSeen: now(),
  });

  const admin = mk('admin', 'admin@inasta.app', 'admin', 'pro', 'Runs this place.');
  const ada = mk('ada', 'ada@inasta.app', 'user', 'plus', 'Building quiet software.');
  const mira = mk('mira', 'mira@inasta.app', 'user', 'free', 'Hometown crew.');
  const kai = mk('kai', 'kai@inasta.app', 'user', 'pro', 'College roommate.');
  db.users = [admin, ada, mira, kai];

  ada.following = [mira._id, kai._id];
  mira.followers = [ada._id];
  kai.followers = [ada._id];

  db.groups = [
    {
      _id: id(),
      name: 'Sunday Dinners',
      creator: pub(ada),
      members: [pub(ada), pub(mira)],
      createdAt: now(),
    },
  ];

  const samples = [
    { user: mira, circle: 'Hometown', caption: 'Lake road, 6am. Nobody else awake.' },
    { user: kai, circle: 'College', caption: 'Last studio crit of the semester. #design' },
    { user: ada, circle: 'General', caption: 'New notebook, same handwriting.' },
  ];
  db.posts = samples.map((s, i) => ({
    _id: id(),
    user: { _id: s.user._id, username: s.user.username },
    image: `https://picsum.photos/seed/inasta${i}/900/1100`,
    images: [],
    caption: s.caption,
    circle: s.circle,
    hashtags: (s.caption.match(/#(\w+)/g) || []).map((t) => t.slice(1).toLowerCase()),
    likes: [],
    comments: [],
    archived: false,
    commentsDisabled: false,
    createdAt: new Date(Date.now() - i * 5400000).toISOString(),
  }));

  db.stories = [
    {
      _id: id(),
      user: { _id: mira._id, username: mira.username },
      media: 'https://picsum.photos/seed/story1/720/1280',
      mediaType: 'image',
      caption: 'morning',
      circle: 'Hometown',
      disappearing: false,
      viewers: [],
      createdAt: now(),
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ];

  save();
}

function pub(u) {
  return {
    id: u._id,
    _id: u._id,
    username: u.username,
    email: u.email,
    bio: u.bio || '',
    role: u.role || 'user',
    plan: u.plan || 'free',
    isVerified: !!u.isVerified,
  };
}

if (!load()) seed();

/* ------------------------------------------------------------------ auth -- */

const sign = (user) => jwt.sign({ userId: user._id }, SECRET, { expiresIn: '30d' });
const findUser = (uid) => db.users.find((u) => u._id === uid);

function auth(req, res, next) {
  const header = req.header('Authorization') || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }
  try {
    const { userId } = jwt.verify(header.slice(7), SECRET);
    const user = findUser(userId);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    if (user.isBanned) {
      return res.status(403).json({ error: user.banReason || 'This account has been suspended.' });
    }
    user.lastSeen = now();
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ error: 'Admin access required.' });

const notify = (recipient, actor, type, extra = {}) => {
  if (String(recipient) === String(actor)) return;
  db.notifications.unshift({
    _id: id(),
    recipient,
    actor: pub(findUser(actor) || {}),
    type,
    read: false,
    createdAt: now(),
    ...extra,
  });
  save();
};

/* ------------------------------------------------------------------ auth -- */

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Please provide username, email and password' });
  }
  if (db.users.some((u) => u.email === email || u.username === username)) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }
  const user = {
    _id: id(),
    username,
    email,
    password,
    role: 'user',
    plan: 'free',
    bio: '',
    isBanned: false,
    isVerified: false,
    following: [],
    followers: [],
    savedPosts: [],
    blocked: [],
    circles: ['General', 'Hometown', 'College'],
    createdAt: now(),
    lastSeen: now(),
  };
  db.users.push(user);
  save();
  res.status(201).json({ message: 'Account created!', token: sign(user), user: pub(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (user.isBanned) return res.status(403).json({ error: user.banReason || 'Account suspended.' });
  user.lastSeen = now();
  save();
  res.json({ message: 'Login successful', token: sign(user), user: pub(user) });
});

app.get('/api/auth/me', auth, (req, res) => res.json({ user: pub(req.user) }));

/* ----------------------------------------------------------------- posts -- */

app.get('/api/posts', auth, (req, res) => {
  const { circle } = req.query;
  const posts = db.posts
    .filter((p) => !p.archived)
    .filter((p) => !circle || circle === 'All' || p.circle === circle)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((p) => ({
      ...p,
      likesCount: p.likes.length,
      isLiked: p.likes.includes(req.user._id),
      isSaved: (req.user.savedPosts || []).includes(p._id),
      commentsCount: p.comments.length,
    }));
  res.json(posts);
});

app.post('/api/posts', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const caption = req.body.caption || '';
  const post = {
    _id: id(),
    user: { _id: req.user._id, username: req.user.username },
    image: `/uploads/${req.file.filename}`,
    images: [],
    caption,
    circle: req.body.circle || 'General',
    location: req.body.location || '',
    hashtags: (caption.match(/#(\w+)/g) || []).map((t) => t.slice(1).toLowerCase()),
    likes: [],
    comments: [],
    archived: false,
    commentsDisabled: false,
    createdAt: now(),
  };
  db.posts.unshift(post);
  save();
  res.status(201).json({ message: 'Post created!', post });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const index = db.posts.findIndex((p) => p._id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });
  if (db.posts[index].user._id !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this post' });
  }
  db.posts.splice(index, 1);
  save();
  res.json({ message: 'Post deleted', postId: req.params.id });
});

/* ---------------------------------------------------- likes / comments ---- */

app.post('/api/posts/:id/like', auth, (req, res) => {
  const post = db.posts.find((p) => p._id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const i = post.likes.indexOf(req.user._id);
  const liked = i === -1;
  if (liked) {
    post.likes.push(req.user._id);
    notify(post.user._id, req.user._id, 'like', { post: { _id: post._id, image: post.image } });
  } else post.likes.splice(i, 1);
  save();
  res.json({ liked, likesCount: post.likes.length });
});

app.post('/api/posts/:id/comments', auth, (req, res) => {
  const post = db.posts.find((p) => p._id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (post.commentsDisabled) return res.status(403).json({ error: 'Comments are turned off' });
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment text is required' });

  const comment = {
    _id: id(),
    user: { _id: req.user._id, username: req.user.username },
    text,
    likes: [],
    createdAt: now(),
  };
  post.comments.push(comment);
  notify(post.user._id, req.user._id, 'comment', { text: text.slice(0, 80) });
  save();
  res.status(201).json({ comment, commentsCount: post.comments.length });
});

app.delete('/api/posts/:id/comments/:commentId', auth, (req, res) => {
  const post = db.posts.find((p) => p._id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const i = post.comments.findIndex((c) => c._id === req.params.commentId);
  if (i === -1) return res.status(404).json({ error: 'Comment not found' });
  const owns = post.comments[i].user._id === req.user._id || post.user._id === req.user._id;
  if (!owns && req.user.role !== 'admin') return res.status(403).json({ error: 'Not authorised' });
  post.comments.splice(i, 1);
  save();
  res.json({ message: 'Comment deleted', commentsCount: post.comments.length });
});

app.post('/api/posts/:id/save', auth, (req, res) => {
  const user = req.user;
  user.savedPosts = user.savedPosts || [];
  const i = user.savedPosts.indexOf(req.params.id);
  const saved = i === -1;
  if (saved) user.savedPosts.push(req.params.id);
  else user.savedPosts.splice(i, 1);
  save();
  res.json({ saved });
});

app.get('/api/saved', auth, (req, res) => {
  const ids = req.user.savedPosts || [];
  res.json(db.posts.filter((p) => ids.includes(p._id)));
});

/* ---------------------------------------------------------------- social -- */

app.post('/api/users/:userId/follow', auth, (req, res) => {
  const target = findUser(req.params.userId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target._id === req.user._id) return res.status(400).json({ error: 'You cannot follow yourself' });

  req.user.following = req.user.following || [];
  target.followers = target.followers || [];
  const i = req.user.following.indexOf(target._id);
  const following = i === -1;
  if (following) {
    req.user.following.push(target._id);
    target.followers.push(req.user._id);
    notify(target._id, req.user._id, 'follow');
  } else {
    req.user.following.splice(i, 1);
    target.followers = target.followers.filter((x) => x !== req.user._id);
  }
  save();
  res.json({ following, followersCount: target.followers.length });
});

app.post('/api/users/:userId/block', auth, (req, res) => {
  req.user.blocked = req.user.blocked || [];
  const i = req.user.blocked.indexOf(req.params.userId);
  const blocked = i === -1;
  if (blocked) req.user.blocked.push(req.params.userId);
  else req.user.blocked.splice(i, 1);
  save();
  res.json({ blocked });
});

app.get('/api/notifications', auth, (req, res) => {
  const items = db.notifications.filter((n) => n.recipient === req.user._id).slice(0, 60);
  res.json({ notifications: items, unread: items.filter((n) => !n.read).length });
});

app.post('/api/notifications/read', auth, (req, res) => {
  db.notifications.forEach((n) => {
    if (n.recipient === req.user._id) n.read = true;
  });
  save();
  res.json({ message: 'All caught up' });
});

app.get('/api/search', auth, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ users: [], posts: [], hashtags: [] });
  const users = db.users
    .filter((u) => u.username.toLowerCase().includes(q) && !u.isBanned)
    .map(pub);
  const posts = db.posts.filter(
    (p) => p.caption.toLowerCase().includes(q) || p.hashtags.includes(q.replace(/^#/, ''))
  );
  const tally = new Map();
  db.posts.forEach((p) =>
    p.hashtags.forEach((t) => {
      if (t.includes(q.replace(/^#/, ''))) tally.set(t, (tally.get(t) || 0) + 1);
    })
  );
  res.json({
    users,
    posts,
    hashtags: [...tally].map(([tag, count]) => ({ tag, count })),
  });
});

/* --------------------------------------------------------------- stories -- */

app.get('/api/stories', auth, (req, res) => {
  const live = db.stories.filter((s) => new Date(s.expiresAt) > new Date());
  const grouped = new Map();
  live.forEach((story) => {
    const key = story.user._id;
    if (!grouped.has(key)) grouped.set(key, { user: story.user, stories: [], hasUnseen: false });
    const seen = story.viewers.some((v) => v.user === req.user._id);
    grouped.get(key).stories.push({ ...story, seen, viewerCount: story.viewers.length });
    if (!seen) grouped.get(key).hasUnseen = true;
  });
  const trays = [...grouped.values()].sort((a, b) => {
    if (a.user._id === req.user._id) return -1;
    if (b.user._id === req.user._id) return 1;
    return Number(b.hasUnseen) - Number(a.hasUnseen);
  });
  res.json({ trays });
});

app.post('/api/stories', auth, upload.single('media'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No media uploaded' });
  const story = {
    _id: id(),
    user: { _id: req.user._id, username: req.user.username },
    media: `/uploads/${req.file.filename}`,
    mediaType: req.file.mimetype.startsWith('video') ? 'video' : 'image',
    caption: req.body.caption || '',
    circle: req.body.circle || 'General',
    disappearing: req.body.disappearing === 'true',
    viewers: [],
    createdAt: now(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
  db.stories.unshift(story);
  save();
  res.status(201).json({ story });
});

app.post('/api/stories/:id/view', auth, (req, res) => {
  const story = db.stories.find((s) => s._id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (!story.viewers.some((v) => v.user === req.user._id)) {
    story.viewers.push({ user: req.user._id, username: req.user.username, viewedAt: now() });
    notify(story.user._id, req.user._id, 'story_view', { text: 'viewed your story' });
  }
  if (story.disappearing && story.user._id !== req.user._id) {
    db.stories = db.stories.filter((s) => s._id !== story._id);
    save();
    return res.json({ consumed: true });
  }
  save();
  res.json({ consumed: false, viewerCount: story.viewers.length });
});

app.post('/api/stories/:id/screenshot', auth, (req, res) => {
  const story = db.stories.find((s) => s._id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  notify(story.user._id, req.user._id, 'system', { text: 'took a screenshot of your story' });
  res.json({ message: 'Author notified' });
});

app.get('/api/stories/:id/viewers', auth, (req, res) => {
  const story = db.stories.find((s) => s._id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user._id !== req.user._id) {
    return res.status(403).json({ error: 'Only the author can see viewers' });
  }
  res.json({ viewers: story.viewers });
});

app.delete('/api/stories/:id', auth, (req, res) => {
  const story = db.stories.find((s) => s._id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.user._id !== req.user._id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorised' });
  }
  db.stories = db.stories.filter((s) => s._id !== req.params.id);
  save();
  res.json({ message: 'Story deleted' });
});

/* -------------------------------------------------------------- messages -- */

app.get('/api/messages/users', auth, (req, res) => {
  res.json(db.users.filter((u) => u._id !== req.user._id && !u.isBanned).map(pub));
});

app.get('/api/messages/:friendId', auth, (req, res) => {
  const { friendId } = req.params;
  res.json(
    db.messages.filter(
      (m) =>
        (m.sender === req.user._id && m.recipient === friendId) ||
        (m.sender === friendId && m.recipient === req.user._id)
    )
  );
});

app.post('/api/messages', auth, (req, res) => {
  const { recipientId, text, disappearing } = req.body || {};
  if (!recipientId || !text) {
    return res.status(400).json({ error: 'recipientId and text are required' });
  }
  const message = {
    _id: id(),
    sender: req.user._id,
    recipient: recipientId,
    text,
    disappearing: !!disappearing,
    readAt: null,
    createdAt: now(),
  };
  db.messages.push(message);
  save();
  res.status(201).json(message);
});

/* ---------------------------------------------------------------- groups -- */

app.get('/api/groups', auth, (req, res) => res.json({ groups: db.groups }));

app.post('/api/groups', auth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  const group = {
    _id: id(),
    name,
    creator: pub(req.user),
    members: [pub(req.user)],
    createdAt: now(),
  };
  db.groups.unshift(group);
  save();
  res.status(201).json({ group });
});

app.post('/api/groups/:groupId/members', auth, (req, res) => {
  const group = db.groups.find((g) => g._id === req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const user = db.users.find((u) => u.username === (req.body || {}).username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!group.members.some((m) => m._id === user._id)) group.members.push(pub(user));
  save();
  res.json({ group, addedUser: pub(user) });
});

app.get('/api/group-messages/:groupId', auth, (req, res) => {
  res.json(db.groupMessages.filter((m) => m.group === req.params.groupId));
});

app.post('/api/group-messages', auth, (req, res) => {
  const { groupId, text } = req.body || {};
  if (!groupId || !text) return res.status(400).json({ error: 'groupId and text are required' });
  const message = {
    _id: id(),
    group: groupId,
    sender: { _id: req.user._id, username: req.user.username },
    text,
    createdAt: now(),
  };
  db.groupMessages.push(message);
  save();
  res.status(201).json(message);
});

/* ----------------------------------------------------------------- admin -- */

const PLAN_PRICE = { free: 0, plus: 199, pro: 499 };
const startOfDay = (offset = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - offset);
  return d;
};

app.get('/api/admin/stats', auth, adminOnly, (req, res) => {
  const today = startOfDay();
  const week = startOfDay(7);
  const since = (v, from) => v && new Date(v) >= from;

  const plans = { free: 0, plus: 0, pro: 0 };
  db.users.forEach((u) => {
    plans[u.plan || 'free'] = (plans[u.plan || 'free'] || 0) + 1;
  });
  const mrr = Object.entries(plans).reduce((s, [p, c]) => s + (PLAN_PRICE[p] || 0) * c, 0);
  const paying = plans.plus + plans.pro;

  const growth = [];
  for (let i = 13; i >= 0; i -= 1) {
    const from = startOfDay(i);
    const to = startOfDay(i - 1);
    growth.push({
      date: from.toISOString().slice(0, 10),
      count: db.users.filter((u) => new Date(u.createdAt) >= from && new Date(u.createdAt) < to)
        .length,
    });
  }

  res.json({
    users: {
      total: db.users.length,
      newToday: db.users.filter((u) => since(u.createdAt, today)).length,
      newThisWeek: db.users.filter((u) => since(u.createdAt, week)).length,
      activeToday: db.users.filter((u) => since(u.lastSeen, today)).length,
      activeThisWeek: db.users.filter((u) => since(u.lastSeen, week)).length,
      banned: db.users.filter((u) => u.isBanned).length,
    },
    content: {
      posts: db.posts.length,
      postsToday: db.posts.filter((p) => since(p.createdAt, today)).length,
      activeStories: db.stories.filter((s) => new Date(s.expiresAt) > new Date()).length,
      messages: db.messages.length,
    },
    monetisation: {
      plans,
      paying,
      conversionRate: db.users.length
        ? Number(((paying / db.users.length) * 100).toFixed(1))
        : 0,
      mrr,
      arr: mrr * 12,
      arpu: db.users.length ? Number((mrr / db.users.length).toFixed(2)) : 0,
      prices: PLAN_PRICE,
    },
    growth,
    generatedAt: now(),
  });
});

app.get('/api/admin/users', auth, adminOnly, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, parseInt(req.query.limit, 10) || 25);
  const { q, plan, role, banned } = req.query;

  let list = [...db.users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  if (q) list = list.filter((u) => u.username.toLowerCase().includes(q.toLowerCase()));
  if (plan) list = list.filter((u) => (u.plan || 'free') === plan);
  if (role) list = list.filter((u) => (u.role || 'user') === role);
  if (banned === 'true') list = list.filter((u) => u.isBanned);

  const total = list.length;
  const slice = list.slice((page - 1) * limit, page * limit).map((u) => ({
    ...pub(u),
    isBanned: !!u.isBanned,
    createdAt: u.createdAt,
    lastSeen: u.lastSeen,
    postCount: db.posts.filter((p) => p.user._id === u._id).length,
  }));

  res.json({ users: slice, total, page, pages: Math.ceil(total / limit) || 1 });
});

app.patch('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { role, plan, isBanned, banReason, isVerified } = req.body || {};

  const losingAdmin = user.role === 'admin' && ((role && role !== 'admin') || isBanned === true);
  if (losingAdmin && db.users.filter((u) => u.role === 'admin' && !u.isBanned).length <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last remaining admin.' });
  }

  if (role !== undefined) user.role = role;
  if (plan !== undefined) user.plan = plan;
  if (isVerified !== undefined) user.isVerified = isVerified;
  if (isBanned !== undefined) {
    user.isBanned = isBanned;
    user.banReason = isBanned ? banReason || 'Violated community guidelines' : '';
  }
  save();
  res.json({ user: pub(user) });
});

app.delete('/api/admin/users/:id', auth, adminOnly, (req, res) => {
  if (req.params.id === req.user._id) {
    return res.status(400).json({ error: 'You cannot delete your own account here.' });
  }
  const user = findUser(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.users = db.users.filter((u) => u._id !== user._id);
  db.posts = db.posts.filter((p) => p.user._id !== user._id);
  db.stories = db.stories.filter((s) => s.user._id !== user._id);
  db.messages = db.messages.filter((m) => m.sender !== user._id && m.recipient !== user._id);
  save();
  res.json({ message: 'User and their content removed' });
});

app.get('/api/admin/posts', auth, adminOnly, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(60, parseInt(req.query.limit, 10) || 24);
  const sorted = [...db.posts].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({
    posts: sorted.slice((page - 1) * limit, page * limit),
    total: sorted.length,
    page,
    pages: Math.ceil(sorted.length / limit) || 1,
  });
});

app.delete('/api/admin/posts/:id', auth, adminOnly, (req, res) => {
  const before = db.posts.length;
  db.posts = db.posts.filter((p) => p._id !== req.params.id);
  if (db.posts.length === before) return res.status(404).json({ error: 'Post not found' });
  save();
  res.json({ message: 'Post removed' });
});

/* ---------------------------------------------------------- static client -- */

const clientDist = path.join(__dirname, '..', 'webapp', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  // Hashed asset filenames are safe to cache forever, but index.html must
  // never be cached: a stale shell keeps pointing browsers at a bundle that
  // no longer exists (or worse, an old one that still does), which is exactly
  // how a fixed client keeps behaving like the broken one.
  app.use(
    express.static(clientDist, {
      etag: false,
      lastModified: false,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );
  app.get(/^(?!\/(api|uploads)\/).*/, (req, res) => {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
    res.sendFile(path.join(clientDist, 'index.html'));
  });
  console.log('📦 Serving built client from webapp/dist');
} else {
  app.get('/', (req, res) => res.json({ message: 'Inasta mock API (in-memory)' }));
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Mock API on http://0.0.0.0:${PORT}`);
  console.log('   admin@inasta.app / password123  (admin)');
  console.log('   ada@inasta.app   / password123');
  console.log(`   data file: ${DATA_FILE}`);
});
