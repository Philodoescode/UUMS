const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile } = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Profile routes - accessible to the logged-in instructor/TA
router.get('/self', getMyProfile);
router.patch('/self', updateMyProfile);

module.exports = router;
