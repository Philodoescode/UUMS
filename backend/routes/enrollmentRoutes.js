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
  approveEnrollment,
} = require('../controllers/enrollmentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Student routes
router.post('/register', authorize('student'), registerForCourse);
router.get('/my-courses', authorize('student'), getMyEnrollments);
router.get('/my-grade/:courseId', authorize('student'), getMyGrade);

// GET routes - accessible to all authenticated users (logic inside controller handles role-based data scoping)
router.get('/', authorize('admin', 'advisor'), getAllEnrollments);
router.get('/:id', getEnrollmentById);

// Advisor routes
router.put('/:id/approval', authorize('advisor', 'admin'), approveEnrollment);

// Modification routes - admin only
router.post('/', authorize('admin'), createEnrollment);
router.put('/:id', authorize('admin'), updateEnrollment);
router.delete('/:id', authorize('admin'), deleteEnrollment);

module.exports = router;

