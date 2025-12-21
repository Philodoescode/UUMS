const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getEmployeeById,
    updateCompensation,
    getCompensationAuditLogs,
    getLeaveRequests,
    getEmployeeLeaveRequests,
    reviewLeaveRequest
} = require('../controllers/hrController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and HR role
router.use(protect);
router.use(authorize('hr'));

// Employee management routes
router.get('/employees', getAllEmployees);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id/compensation', updateCompensation);
router.get('/employees/:id/compensation/audit', getCompensationAuditLogs);
router.get('/employees/:id/leave-requests', getEmployeeLeaveRequests);

// Leave request management routes
router.get('/leave-requests', getLeaveRequests);
router.put('/leave-requests/:id', reviewLeaveRequest);

module.exports = router;
