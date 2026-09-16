const express = require('express');
const { createPost, getPosts, getUserPosts, deletePost } = require('../controllers/postController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', auth, upload.single('image'), createPost);
router.get('/', auth, getPosts);
router.get('/user/:userId', auth, getUserPosts);
router.delete('/:id', auth, deletePost);

module.exports = router;
