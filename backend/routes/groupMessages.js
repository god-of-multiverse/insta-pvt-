const express = require('express');
const { sendGroupMessage, getGroupMessages } = require('../controllers/groupMessageController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.post('/', sendGroupMessage);
router.get('/:groupId', getGroupMessages);

module.exports = router;
