const express = require('express');
const c = require('../controllers/circleController');
const auth = require('../middleware/auth');

const router = express.Router();

// Circles define who can see what, so every route is authenticated and
// owner-scoped inside the controller.
router.get('/', auth, c.listCircles);
router.post('/', auth, c.createCircle);
router.post('/:id/members', auth, c.addMember);
router.delete('/:id/members/:userId', auth, c.removeMember);
router.delete('/:id', auth, c.deleteCircle);

module.exports = router;
