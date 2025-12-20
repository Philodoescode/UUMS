const express = require('express');
const router = express.Router();
const {
    getCompensation,
    updateCompensation,
    getBenefits,
    updateBenefits,
    getLeaveRequests,
    respondLeaveRequest
} = require('../controllers/hrController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// HR Role Authorization for all specific HR routes
router.use(authorize('hr'));

router.get('/compensation', getCompensation);
router.post('/compensation', updateCompensation);

router.get('/benefits', getBenefits);
router.post('/benefits', updateBenefits);

router.get('/leaves', getLeaveRequests);
router.put('/leaves/:id', respondLeaveRequest);

module.exports = router;
