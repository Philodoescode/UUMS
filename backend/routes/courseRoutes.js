const express = require('express');
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/', getAllCourses);
router.get('/:id', getCourseById);

// Modification routes - admin only
router.post('/', authorize('admin'), createCourse);
router.put('/:id', authorize('admin'), updateCourse);
router.delete('/:id', authorize('admin'), deleteCourse);

module.exports = router;
