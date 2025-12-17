const express = require('express');
const router = express.Router();
const {
    createRequest,
    getRequests,
    updateStatus,
} = require('../controllers/maintenanceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createRequest);
router.get('/', getRequests);
router.patch('/:id/status', authorize('admin'), updateStatus);

module.exports = router;
