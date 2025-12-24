const express = require('express');
const router = express.Router();
const { createFeedback } = require('../controllers/studentFeedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('student'), createFeedback);

module.exports = router;
