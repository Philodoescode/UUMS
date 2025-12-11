const express = require('express');
const router = express.Router();
const {
  createEnrollment,
  getAllEnrollments,
  getEnrollmentById,
  updateEnrollment,
  deleteEnrollment,
  registerForCourse,
  getMyEnrollments,
  getMyGrade,
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Student routes
router.post('/register', authorize('student'), registerForCourse);
router.get('/my-courses', authorize('student'), getMyEnrollments);
router.get('/my-grade/:courseId', authorize('student'), getMyGrade);

// GET routes - accessible to all authenticated users
router.get('/', getAllEnrollments);
router.get('/:id', getEnrollmentById);

// Modification routes - admin only
router.post('/', authorize('admin'), createEnrollment);
router.put('/:id', authorize('admin'), updateEnrollment);
router.delete('/:id', authorize('admin'), deleteEnrollment);

module.exports = router;

