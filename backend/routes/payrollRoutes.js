const express = require('express');
const router = express.Router();
const {
    getCurrentCompensation,
    getSalaryHistory,
    downloadPayslipPDF
} = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Allow Instructors and TAs
// Note: If other roles need access, add them here.
router.get('/current', authorize('instructor', 'ta'), getCurrentCompensation);
router.get('/history', authorize('instructor', 'ta'), getSalaryHistory);
router.get('/download/:id', authorize('instructor', 'ta'), downloadPayslipPDF);

module.exports = router;
