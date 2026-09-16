const express = require('express');
const auth = require('../middleware/auth');
const c = require('../controllers/socialController');

const router = express.Router();

router.post('/posts/:id/like', auth, c.toggleLike);
router.post('/posts/:id/comments', auth, c.addComment);
router.delete('/posts/:id/comments/:commentId', auth, c.deleteComment);
router.post('/posts/:id/save', auth, c.toggleSave);
router.get('/saved', auth, c.getSaved);

router.post('/users/:userId/follow', auth, c.toggleFollow);
router.post('/users/:userId/block', auth, c.toggleBlock);

router.get('/notifications', auth, c.getNotifications);
router.post('/notifications/read', auth, c.markNotificationsRead);

router.get('/search', auth, c.search);

module.exports = router;
