/**
 * Offline demo API.
 *
 * Same routes and payload shapes as the real Express + MongoDB backend, but all
 * state lives in memory. Useful when MongoDB Atlas is unreachable (e.g. the
 * machine's IP is not whitelisted) and you just want to click through the UI.
 *
 *   npm run dev:mock
 *
 * Seeded account:  ada@inasta.app  /  password123
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const upload = multer({ dest: path.join(__dirname, 'uploads') });

const id = () => crypto.randomBytes(12).toString('hex');
const now = () => new Date().toISOString();

const db = { users: [], posts: [], messages: [], groups: [], groupMessages: [] };

function seed() {
  const ada = { _id: id(), username: 'ada', email: 'ada@inasta.app', password: 'password123', bio: 'Building quiet software.' };
  const mira = { _id: id(), username: 'mira', email: 'mira@inasta.app', password: 'password123', bio: 'Hometown crew.' };
  const kai = { _id: id(), username: 'kai', email: 'kai@inasta.app', password: 'password123', bio: 'College roommate.' };
  db.users.push(ada, mira, kai);

  const group = { _id: id(), name: 'Sunday Dinners', creator: ada, members: [ada, mira], createdAt: now() };
  db.groups.push(group);

  const samples = [
    { user: mira, circle: 'Hometown', caption: 'Lake road, 6am. Nobody else awake.' },
    { user: kai, circle: 'College', caption: 'Last studio crit of the semester.' },
    { user: ada, circle: 'General', caption: 'New notebook, same handwriting.' },
  ];
  samples.forEach((s, i) => {
    db.posts.push({
      _id: id(),
      user: { _id: s.user._id, username: s.user.username },
      image: `https://picsum.photos/seed/inasta${i}/900/1100`,
      caption: s.caption,
      circle: s.circle,
      likes: [],
      comments: [],
      createdAt: new Date(Date.now() - i * 5400000).toISOString(),
    });
  });
}
seed();

const tokens = new Map();
const publicUser = (u) => ({ id: u._id, _id: u._id, username: u.username, email: u.email, bio: u.bio || '' });

function auth(req, res, next) {
  const header = req.header('Authorization') || '';
  const token = header.replace('Bearer ', '');
  const userId = tokens.get(token);
  const user = db.users.find((u) => u._id === userId);
  if (!user) return res.status(401).json({ error: 'Access denied. No token provided.' });
  req.user = { id: user._id, ...user };
  next();
}

function issue(user) {
  const token = id() + id();
  tokens.set(token, user._id);
  return token;
}

app.post('/api/auth/signup', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ error: 'Please provide username, email and password' });
  if (db.users.some((u) => u.email === email || u.username === username)) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }
  const user = { _id: id(), username, email, password, bio: '' };
  db.users.push(user);
  res.status(201).json({ message: 'Account created!', token: issue(user), user: publicUser(user) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.users.find((u) => u.email === email && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ message: 'Login successful', token: issue(user), user: publicUser(user) });
});

app.get('/api/posts', (req, res) => {
  const { circle } = req.query;
  const posts = db.posts
    .filter((p) => !circle || circle === 'All' || p.circle === circle)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(posts);
});

app.post('/api/posts', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  const post = {
    _id: id(),
    user: { _id: req.user.id, username: req.user.username },
    image: `/uploads/${req.file.filename}`,
    caption: req.body.caption || '',
    circle: req.body.circle || 'General',
    likes: [],
    comments: [],
    createdAt: now(),
  };
  db.posts.unshift(post);
  res.status(201).json({ message: 'Post created!', post });
});

app.delete('/api/posts/:id', auth, (req, res) => {
  const index = db.posts.findIndex((p) => p._id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Post not found' });
  if (db.posts[index].user._id !== req.user.id) return res.status(403).json({ error: 'Not authorized to delete this post' });
  db.posts.splice(index, 1);
  res.json({ message: 'Post deleted', postId: req.params.id });
});

app.get('/api/messages/users', auth, (req, res) => {
  res.json(db.users.filter((u) => u._id !== req.user.id).map(publicUser));
});

app.get('/api/messages/:friendId', auth, (req, res) => {
  const { friendId } = req.params;
  res.json(
    db.messages.filter(
      (m) => (m.sender === req.user.id && m.recipient === friendId) || (m.sender === friendId && m.recipient === req.user.id)
    )
  );
});

app.post('/api/messages', auth, (req, res) => {
  const { recipientId, text } = req.body || {};
  if (!recipientId || !text) return res.status(400).json({ error: 'recipientId and text are required' });
  const message = { _id: id(), sender: req.user.id, recipient: recipientId, text, createdAt: now() };
  db.messages.push(message);
  res.status(201).json(message);
});

app.get('/api/groups', auth, (req, res) => {
  res.json({ groups: db.groups });
});

app.post('/api/groups', auth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Group name is required' });
  const me = db.users.find((u) => u._id === req.user.id);
  const group = { _id: id(), name, creator: publicUser(me), members: [publicUser(me)], createdAt: now() };
  db.groups.unshift(group);
  res.status(201).json({ group });
});

app.post('/api/groups/:groupId/members', auth, (req, res) => {
  const group = db.groups.find((g) => g._id === req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  const user = db.users.find((u) => u.username === (req.body || {}).username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!group.members.some((m) => m._id === user._id)) group.members.push(publicUser(user));
  res.json({ group, addedUser: publicUser(user) });
});

app.get('/api/group-messages/:groupId', auth, (req, res) => {
  res.json(db.groupMessages.filter((m) => m.group === req.params.groupId));
});

app.post('/api/group-messages', auth, (req, res) => {
  const { groupId, text } = req.body || {};
  if (!groupId || !text) return res.status(400).json({ error: 'groupId and text are required' });
  const message = { _id: id(), group: groupId, sender: { _id: req.user.id, username: req.user.username }, text, createdAt: now() };
  db.groupMessages.push(message);
  res.status(201).json(message);
});

app.get('/', (req, res) => res.json({ message: 'Inasta mock API (in-memory)' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🧪 Mock API on http://0.0.0.0:${PORT} — login ada@inasta.app / password123`);
});
