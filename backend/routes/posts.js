const express = require('express');
const { createPost, getPosts, getUserPosts, deletePost } = require('../controllers/postController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.post('/', auth, upload.single('image'), createPost);
router.get('/', getPosts);
router.get('/user/:userId', getUserPosts);
router.delete('/:id', auth, deletePost);

module.exports = router;
