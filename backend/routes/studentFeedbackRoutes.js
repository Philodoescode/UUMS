const express = require('express');
const router = express.Router();
const { createFeedback, getMyFeedback } = require('../controllers/studentFeedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), createFeedback);
router.get('/my-feedback', protect, getMyFeedback);

module.exports = router;
