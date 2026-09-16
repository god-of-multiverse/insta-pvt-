const express = require('express');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const c = require('../controllers/storyController');

const router = express.Router();

router.get('/', auth, c.getStories);
router.post('/', auth, upload.single('media'), c.createStory);
router.post('/:id/view', auth, c.viewStory);
router.post('/:id/screenshot', auth, c.reportScreenshot);
router.get('/:id/viewers', auth, c.getViewers);
router.delete('/:id', auth, c.deleteStory);

module.exports = router;
