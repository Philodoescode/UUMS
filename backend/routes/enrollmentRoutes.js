const express = require('express');
const router = express.Router();
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/', getAllEnrollments);
router.get('/:id', getEnrollmentById);

// Modification routes - admin only
router.post('/', authorize('admin'), createEnrollment);
router.put('/:id', authorize('admin'), updateEnrollment);
router.delete('/:id', authorize('admin'), deleteEnrollment);

module.exports = router;
