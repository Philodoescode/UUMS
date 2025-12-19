const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  getCourseInstructors,
  assignInstructor,
  removeInstructor,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users EXCEPT HR
router.get('/', authorize('admin', 'student', 'instructor', 'advisor'), getAllCourses);
router.get('/:id', getCourseById);
router.get('/:id/instructors', getCourseInstructors);

// Modification routes - admin only
router.post('/', authorize('admin'), createCourse);
router.put('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

// Instructor assignment routes - admin only
router.post('/:id/instructors', authorize('admin'), assignInstructor);
router.delete('/:id/instructors/:instructorId', authorize('admin'), removeInstructor);

module.exports = router;
