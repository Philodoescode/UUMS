const express = require('express');
const router = express.Router();
const { getMyBenefits } = require('../controllers/staffBenefitsController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication and instructor or ta role
router.use(protect);
router.use(authorize('instructor', 'ta'));

// Get my benefits
router.get('/my-benefits', getMyBenefits);

module.exports = router;
