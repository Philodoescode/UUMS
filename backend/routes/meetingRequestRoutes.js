const express = require('express');
const router = express.Router();
const {
  createMeetingRequest,
  getMyMeetingRequests,
  getMeetingRequestById,
  updateMeetingRequestStatus,
  deleteMeetingRequest,
} = require('../controllers/meetingRequestController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET /api/meeting-requests/my-requests - Get my meeting requests
// Must be before /:id to avoid matching 'my-requests' as an id
router.get('/my-requests', getMyMeetingRequests);

// POST /api/meeting-requests - Create a new meeting request
router.post('/', createMeetingRequest);

// GET /api/meeting-requests/:id - Get single meeting request
router.get('/:id', getMeetingRequestById);

// PUT /api/meeting-requests/:id/status - Update meeting request status
router.put('/:id/status', updateMeetingRequestStatus);

// DELETE /api/meeting-requests/:id - Delete meeting request
router.delete('/:id', deleteMeetingRequest);

module.exports = router;
