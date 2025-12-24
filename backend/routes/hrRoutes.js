const express = require('express');
const router = express.Router();
const {
    getAllEmployees,
    getEmployeeById,
    updateCompensation,
    getCompensationAuditLogs,
    getLeaveRequests,
    getEmployeeLeaveRequests,
    reviewLeaveRequest,
    getEmployeeBenefits,
    updateEmployeeBenefits,
    getBenefitsAuditLogs,
    getAllEmployeesWithBenefits
} = require('../controllers/hrController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and HR role
router.use(protect);
router.use(authorize('hr'));

// Employee management routes
router.get('/employees', getAllEmployees);
router.get('/employees-benefits', getAllEmployeesWithBenefits);
router.get('/employees/:id', getEmployeeById);
router.put('/employees/:id/compensation', updateCompensation);
router.get('/employees/:id/compensation/audit', getCompensationAuditLogs);
router.get('/employees/:id/leave-requests', getEmployeeLeaveRequests);

// Benefits management routes
router.get('/employees/:id/benefits', getEmployeeBenefits);
router.put('/employees/:id/benefits', updateEmployeeBenefits);
router.get('/employees/:id/benefits/audit', getBenefitsAuditLogs);

// Leave request management routes
router.get('/leave-requests', getLeaveRequests);
router.put('/leave-requests/:id', reviewLeaveRequest);

module.exports = router;

