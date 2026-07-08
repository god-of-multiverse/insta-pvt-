const express = require('express');
const { sendMessage, getMessages, getChatUsers } = require('../controllers/messageController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth); // protect all messages routes

router.post('/', sendMessage);
router.get('/users', getChatUsers);
router.get('/:friendId', getMessages);

module.exports = router;
