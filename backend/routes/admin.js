const express = require('express');
const auth = require('../middleware/auth');
const c = require('../controllers/adminController');

const router = express.Router();

// Every route below requires an authenticated admin
router.use(auth, auth.admin());

router.get('/stats', c.getStats);
router.get('/users', c.listUsers);
router.patch('/users/:id', c.updateUser);
router.delete('/users/:id', c.deleteUser);
router.get('/posts', c.listPosts);
router.delete('/posts/:id', c.deletePost);

module.exports = router;
