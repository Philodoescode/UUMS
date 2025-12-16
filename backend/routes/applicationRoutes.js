const express = require('express');
const router = express.Router();
const {
    createApplication,
    getAllApplications,
    getApplicationById,
    updateApplicationStatus
} = require('../controllers/applicationController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public route - No protect middleware
router.post('/', createApplication);

// Admin routes - Protected
// GET /api/applications - View all applications (filtered by status)
router.get('/', protect, authorize('admin'), getAllApplications);

// GET /api/applications/:id - View specific application details
router.get('/:id', protect, authorize('admin'), getApplicationById);

// PUT /api/applications/:id/status - Update application status (Approve/Reject)
router.put('/:id/status', protect, authorize('admin'), updateApplicationStatus);

module.exports = router;
