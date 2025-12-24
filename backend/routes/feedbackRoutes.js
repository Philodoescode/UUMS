const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Route for students to submit feedback
router.post(
    '/submit',
    protect,
    authorize('Student'),
    feedbackController.submitFeedback
);

// Route for staff (Instructor/TA) to view their feedback
router.get(
    '/my-feedback',
    protect,
    authorize('Instructor', 'TA'),
    feedbackController.getStaffFeedback
);

module.exports = router;
