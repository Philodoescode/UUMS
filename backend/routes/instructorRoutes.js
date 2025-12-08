const express = require('express');
const router = express.Router();
const {
  createInstructor,
  getAllInstructors,
  getInstructorById,
  updateInstructor,
  deleteInstructor,
} = require('../controllers/instructorController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// GET routes - accessible to all authenticated users
router.get('/', getAllInstructors);
router.get('/:id', getInstructorById);

// Modification routes - admin only
router.post('/', authorize('admin'), createInstructor);
router.put('/:id', authorize('admin'), updateInstructor);
router.delete('/:id', authorize('admin'), deleteInstructor);

module.exports = router;
