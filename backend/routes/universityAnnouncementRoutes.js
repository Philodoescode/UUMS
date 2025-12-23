const express = require('express');
const router = express.Router();
const { 
  createUniversityAnnouncement, 
  getUniversityAnnouncements 
} = require('../controllers/universityAnnouncementController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// POST /api/university-announcements - Create new announcement (admin, hr, or instructor with advisor title)
router.post('/', createUniversityAnnouncement);

// GET /api/university-announcements - Get all announcements (all authenticated users can view)
router.get('/', getUniversityAnnouncements);

module.exports = router;
