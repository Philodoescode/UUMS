const express = require('express');
const router = express.Router();
const {
    submitLeaveRequest,
    getMyLeaveRequests,
    cancelLeaveRequest,
    getLeaveRequestById,
} = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Routes for instructors and TAs to manage their own leave requests
router.post('/', authorize('instructor', 'ta'), submitLeaveRequest);
router.get('/my', authorize('instructor', 'ta'), getMyLeaveRequests);
router.get('/:id', authorize('instructor', 'ta'), getLeaveRequestById);
router.delete('/:id', authorize('instructor', 'ta'), cancelLeaveRequest);

module.exports = router;
