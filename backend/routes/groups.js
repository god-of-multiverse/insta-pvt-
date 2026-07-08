const express = require('express');
const { createGroup, getGroups, addMember } = require('../controllers/groupController');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/', auth, createGroup);
router.get('/', auth, getGroups);
router.post('/:id/members', auth, addMember);

module.exports = router;
