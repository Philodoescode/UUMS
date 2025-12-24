const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getMyProfile, updateMyProfile, getProfileById } = require('../controllers/profileController');

// All routes require authentication
router.use(protect);

// Profile routes - accessible to the logged-in instructor/TA
router.get('/self', authorize('instructor', 'ta'), getMyProfile);
router.patch('/self', authorize('instructor', 'ta'), updateMyProfile);

// Public profile viewing (accessible to all authenticated users)
router.get('/:id', getProfileById);

module.exports = router;
