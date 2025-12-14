const express = require('express');
const router = express.Router();
const { createAnnouncement, getCourseAnnouncements } = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', authorize('instructor', 'admin'), createAnnouncement);
router.get('/course/:courseId', getCourseAnnouncements);

module.exports = router;
